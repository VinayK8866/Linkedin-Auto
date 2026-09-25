import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { logActivity, getDailyQuotaUsage, getSetting } from './db.js';

const PROFILE_DIR = path.resolve(process.cwd(), 'data/browser_profile');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

const CHROME_PATH = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;

let activeContext: BrowserContext | null = null;

// Randomized human pause
export function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * 500 - 250;
  return new Promise(resolve => setTimeout(resolve, Math.max(100, ms + jitter)));
}

export async function getPersistentContext(headless: boolean = true): Promise<BrowserContext> {
  if (activeContext) {
    try {
      // Check if context is still alive
      activeContext.pages();
      return activeContext;
    } catch {
      activeContext = null;
    }
  }

  activeContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    executablePath: CHROME_PATH,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--start-maximized',
      '--disable-infobars'
    ],
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  });

  return activeContext;
}

export async function checkSessionHealth(): Promise<{ isLoggedIn: boolean; username?: string; message: string }> {
  try {
    const context = await getPersistentContext(true);
    const page = await context.newPage();
    try {
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);

      const url = page.url();
      if (url.includes('/login') || url.includes('/checkpoint') || url.includes('/authwall')) {
        await page.close();
        return { isLoggedIn: false, message: 'Session expired or not logged in. Please launch manual login.' };
      }

      // Check for feed elements
      const navElement = await page.$('.global-nav');
      if (navElement) {
        await page.close();
        return { isLoggedIn: true, message: 'Connected to LinkedIn successfully.' };
      }

      await page.close();
      return { isLoggedIn: false, message: 'LinkedIn feed not detected. Check login.' };
    } catch (err: any) {
      await page.close().catch(() => {});
      return { isLoggedIn: false, message: `Connection check failed: ${err.message}` };
    }
  } catch (err: any) {
    return { isLoggedIn: false, message: `Could not launch browser: ${err.message}` };
  }
}

export async function launchManualLogin(): Promise<{ success: boolean; message: string }> {
  try {
    // Launch headed window for user
    const context = await getPersistentContext(false);
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
    logActivity('Launched interactive browser for manual login', 'session', 'info');
    return {
      success: true,
      message: 'Visible browser window opened. Please log in with your credentials and complete 2FA. Session will persist automatically.'
    };
  } catch (err: any) {
    return { success: false, message: `Failed to open login window: ${err.message}` };
  }
}

export async function sendConnectionRequest(profileUrl: string, note?: string): Promise<{ success: boolean; message: string }> {
  const quotas = getDailyQuotaUsage();
  const limits = getSetting('rateLimits', { maxConnectionsPerDay: 15 });
  if (quotas.connection >= limits.maxConnectionsPerDay) {
    const msg = `Daily connection cap reached (${quotas.connection}/${limits.maxConnectionsPerDay}). Pausing for safety.`;
    logActivity(msg, 'connection', 'warning');
    return { success: false, message: msg };
  }

  const context = await getPersistentContext(true);
  const page = await context.newPage();

  try {
    logActivity(`Navigating to prospect: ${profileUrl}`, 'connection', 'info');
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);

    // Check if already connected or pending
    const pageText = await page.content();
    if (pageText.includes('Pending') || pageText.includes('Message') && !pageText.includes('Connect')) {
      await page.close();
      logActivity(`Already connected or request pending for ${profileUrl}`, 'connection', 'info');
      return { success: true, message: 'Already connected or connection request is already pending.' };
    }

    // Try finding direct Connect button
    let connectButton = await page.$('button:has-text("Connect")');
    if (!connectButton) {
      // Check in More dropdown
      const moreButton = await page.$('button[aria-label="More actions"], button:has-text("More")');
      if (moreButton) {
        await moreButton.click();
        await sleep(1000);
        connectButton = await page.$('div[aria-label*="Invite"] span:has-text("Connect"), div:has-text("Connect")');
      }
    }

    if (!connectButton) {
      await page.close();
      return { success: false, message: 'Connect button not found on profile (may require InMail or email).' };
    }

    await connectButton.click();
    await sleep(1500);

    // Check if "Add a note" modal appears
    if (note && note.trim()) {
      const addNoteBtn = await page.$('button:has-text("Add a note")');
      if (addNoteBtn) {
        await addNoteBtn.click();
        await sleep(1000);

        const textarea = await page.$('textarea[name="message"]');
        if (textarea) {
          // Human typing simulation
          const cleanNote = note.slice(0, 200);
          await textarea.fill(cleanNote);
          await sleep(1000);
        }
      }
    }

    // Click Send
    const sendBtn = await page.$('button[aria-label="Send invitation"], button:has-text("Send"), button[aria-label="Send now"]');
    if (sendBtn) {
      await sendBtn.click();
      await sleep(2000);
      logActivity(`Connection request sent to ${profileUrl}`, 'connection', 'success', note);
      await page.close();
      return { success: true, message: 'Connection request sent successfully.' };
    }

    await page.close();
    return { success: false, message: 'Could not locate the Send button in the modal.' };
  } catch (err: any) {
    await page.close().catch(() => {});
    logActivity(`Failed connection to ${profileUrl}: ${err.message}`, 'connection', 'error');
    return { success: false, message: err.message };
  }
}

export async function postCommentOnPost(postUrl: string, commentText: string): Promise<{ success: boolean; message: string }> {
  const quotas = getDailyQuotaUsage();
  const limits = getSetting('rateLimits', { maxCommentsPerDay: 20 });
  if (quotas.comment >= limits.maxCommentsPerDay) {
    const msg = `Daily comment cap reached (${quotas.comment}/${limits.maxCommentsPerDay}). Pausing for safety.`;
    logActivity(msg, 'comment', 'warning');
    return { success: false, message: msg };
  }

  const context = await getPersistentContext(true);
  const page = await context.newPage();

  try {
    logActivity(`Opening post to comment: ${postUrl}`, 'comment', 'info');
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);

    // Click comment box
    const commentBox = await page.$('div[role="textbox"][aria-label*="comment" i], .comments-comment-box__editor');
    if (!commentBox) {
      const commentActionBtn = await page.$('button:has-text("Comment")');
      if (commentActionBtn) {
        await commentActionBtn.click();
        await sleep(1000);
      }
    }

    const inputArea = await page.$('div[role="textbox"]');
    if (!inputArea) {
      await page.close();
      return { success: false, message: 'Could not find comment text box on post.' };
    }

    await inputArea.click();
    await sleep(500);
    await inputArea.fill(commentText);
    await sleep(1500);

    // Click submit
    const submitBtn = await page.$('button.comments-comment-box__submit-button, button:has-text("Post")');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(2000);
      logActivity(`Comment published on ${postUrl}`, 'comment', 'success', commentText);
      await page.close();
      return { success: true, message: 'Comment published successfully.' };
    }

    await page.close();
    return { success: false, message: 'Submit button not clickable on post.' };
  } catch (err: any) {
    await page.close().catch(() => {});
    logActivity(`Failed comment on ${postUrl}: ${err.message}`, 'comment', 'error');
    return { success: false, message: err.message };
  }
}

export async function publishPostViaBrowser(postText: string): Promise<{ success: boolean; message: string }> {
  const quotas = getDailyQuotaUsage();
  const limits = getSetting('rateLimits', { maxPostsPerDay: 2 });
  if (quotas.post >= limits.maxPostsPerDay) {
    const msg = `Daily post cap reached (${quotas.post}/${limits.maxPostsPerDay}).`;
    logActivity(msg, 'post', 'warning');
    return { success: false, message: msg };
  }

  const context = await getPersistentContext(true);
  const page = await context.newPage();

  try {
    logActivity('Publishing post via stealth browser fallback...', 'post', 'info');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // Click "Start a post"
    const startPostBtn = await page.$('button:has-text("Start a post")');
    if (!startPostBtn) {
      await page.close();
      return { success: false, message: 'Could not find "Start a post" button on feed.' };
    }

    await startPostBtn.click();
    await sleep(2000);

    // Type post content into editor
    const editor = await page.$('div[role="textbox"][aria-label*="post" i], div.editor-content div[role="textbox"]');
    if (!editor) {
      await page.close();
      return { success: false, message: 'Post editor text area not found in modal.' };
    }

    await editor.click();
    await sleep(500);
    await editor.fill(postText);
    await sleep(2000);

    // Click Post button
    const postSubmitBtn = await page.$('button.share-actions__primary-action, button:has-text("Post")');
    if (postSubmitBtn) {
      await postSubmitBtn.click();
      await sleep(3000);
      logActivity('Post published to LinkedIn feed successfully', 'post', 'success', postText.slice(0, 100) + '...');
      await page.close();
      return { success: true, message: 'Post published successfully via browser automation.' };
    }

    await page.close();
    return { success: false, message: 'Post submit button could not be clicked.' };
  } catch (err: any) {
    await page.close().catch(() => {});
    logActivity(`Failed to publish post: ${err.message}`, 'post', 'error');
    return { success: false, message: err.message };
  }
}

export async function scanCreatorRecentPost(creatorProfileUrl: string): Promise<{ authorName: string; postUrl: string; postText: string } | null> {
  const context = await getPersistentContext(true);
  const page = await context.newPage();

  try {
    const activityUrl = creatorProfileUrl.replace(/\/$/, '') + '/recent-activity/all/';
    logActivity(`Scanning creator recent activity: ${activityUrl}`, 'system', 'info');
    await page.goto(activityUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const firstPost = await page.$('.feed-shared-update-v2');
    if (!firstPost) {
      await page.close();
      return null;
    }

    const textEl = await firstPost.$('.feed-shared-update-v2__description, .feed-shared-inline-show-more-text');
    const postText = textEl ? (await textEl.innerText()).trim() : '';

    const authorEl = await page.$('h1, .text-heading-xlarge');
    const authorName = authorEl ? (await authorEl.innerText()).trim() : 'Creator';

    await page.close();
    return {
      authorName,
      postUrl: activityUrl,
      postText
    };
  } catch (err: any) {
    await page.close().catch(() => {});
    return null;
  }
}
