import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, db, getSetting, setSetting, getDailyQuotaUsage, logActivity } from './db.js';
import { checkSessionHealth, launchManualLogin } from './automation.js';
import { generatePostDraft, generateCarouselSlides, generateConnectionNote, generateCommentDraft, HOOK_FORMULAS, FOUNDER_ANGLES, COMMENT_TEMPLATES } from './ai.js';
import { cleanDraft, scoreDraft } from './humanizer.js';
import { startScheduler, isWithinWorkingHours, dispatchNextApprovedItem } from './scheduler.js';
import { scanCreatorRecentPost } from './automation.js';
import { compileCarouselToPdf } from './carousel-pdf.js';
import { compileQuoteCardToPng } from './visual-generator.js';

const MEDIA_DIR = path.resolve(process.cwd(), 'data/generated_media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

initDatabase();
startScheduler();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/media', express.static(MEDIA_DIR));

// API Status & LinkedIn Session
app.get('/api/status', async (req, res) => {
  try {
    const quotas = getDailyQuotaUsage();
    const limits = getSetting('rateLimits', { maxConnectionsPerDay: 15, maxCommentsPerDay: 20, maxPostsPerDay: 2 });
    const autoSchedule = getSetting<boolean>('autoSchedule', false);
    const inWorkingHours = isWithinWorkingHours();

    res.json({
      quotas,
      limits,
      autoSchedule,
      inWorkingHours,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/session/check', async (req, res) => {
  const result = await checkSessionHealth();
  res.json(result);
});

app.post('/api/session/login', async (req, res) => {
  const result = await launchManualLogin();
  res.json(result);
});

// Review Queue Endpoints
app.get('/api/queue', (req, res) => {
  const { status, type } = req.query;
  let query = 'SELECT * FROM queue WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  query += ' ORDER BY id DESC';

  const items = db.prepare(query).all(...params);
  res.json(items.map((item: any) => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null
  })));
});

app.post('/api/queue', (req, res) => {
  const { type, content, title, targetUrl, targetName, metadata, status } = req.body;
  const insert = db.prepare(`
    INSERT INTO queue (type, content, title, targetUrl, targetName, metadata, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insert.run(
    type || 'post',
    content,
    title || null,
    targetUrl || null,
    targetName || null,
    metadata ? JSON.stringify(metadata) : null,
    status || 'pending'
  );
  logActivity(`Added new ${type || 'post'} to review queue (#${result.lastInsertRowid})`, type || 'post', 'info');
  res.json({ id: result.lastInsertRowid, success: true });
});

app.patch('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  const { status, content, title, scheduledFor } = req.body;

  const current = db.prepare('SELECT * FROM queue WHERE id = ?').get(id) as any;
  if (!current) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  const newStatus = status ?? current.status;
  const newContent = content ?? current.content;
  const newTitle = title ?? current.title;
  const newScheduledFor = scheduledFor ?? current.scheduledFor;

  db.prepare(`
    UPDATE queue 
    SET status = ?, content = ?, title = ?, scheduledFor = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(newStatus, newContent, newTitle, newScheduledFor, id);

  if (status && status !== current.status) {
    logActivity(`Queue item #${id} status changed to ${status}`, current.type, 'info');
  }

  res.json({ success: true });
});

app.delete('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM queue WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/queue/dispatch-next', async (req, res) => {
  const result = await dispatchNextApprovedItem();
  res.json(result);
});

// AI & Content Generation
app.get('/api/metadata/formulas', (req, res) => {
  res.json({
    hookFormulas: HOOK_FORMULAS,
    founderAngles: FOUNDER_ANGLES,
    commentTemplates: COMMENT_TEMPLATES
  });
});

app.post('/api/generate/post', async (req, res) => {
  try {
    const { topic, formulaId, founderAngleId, customInstructions, targetLength } = req.body;
    const result = await generatePostDraft({
      topic,
      formulaId,
      founderAngleId,
      customInstructions,
      targetLength
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/carousel', async (req, res) => {
  try {
    const { topic, numSlides } = req.body;
    const slides = await generateCarouselSlides({ topic, numSlides });
    res.json({ slides });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/carousel/render-pdf', async (req, res) => {
  try {
    const { slides, authorName, authorHandle, theme } = req.body;
    const persona = getSetting('persona', {});
    const result = await compileCarouselToPdf({
      slides,
      authorName: authorName || persona.name || 'Vinay',
      authorHandle: authorHandle || '@vinay',
      theme
    });
    res.json({
      success: true,
      pdfUrl: `/media/${result.filename}`,
      filename: result.filename,
      pdfPath: result.pdfPath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/quote-card', async (req, res) => {
  try {
    const { quoteText, authorName, authorRole, theme } = req.body;
    const persona = getSetting('persona', {});
    const result = await compileQuoteCardToPng({
      quoteText,
      authorName: authorName || persona.name || 'Vinay',
      authorRole: authorRole || persona.role || 'Tech Founder',
      theme
    });
    res.json({
      success: true,
      imageUrl: `/media/${result.filename}`,
      filename: result.filename,
      pngPath: result.pngPath
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/connection-note', async (req, res) => {
  try {
    const { prospectName, headline, company, specificHook } = req.body;
    const note = await generateConnectionNote({ prospectName, headline, company, specificHook });
    res.json({ note, charCount: note.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate/comment', async (req, res) => {
  try {
    const { postAuthor, postText, templateId } = req.body;
    const result = await generateCommentDraft({ postAuthor, postText, templateId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/humanize', async (req, res) => {
  try {
    const { text } = req.body;
    const cleaned = await cleanDraft(text);
    const audit = await scoreDraft(cleaned.text);
    res.json({ cleaned: cleaned.text, report: cleaned.report, audit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Target Creators & Prospects
app.get('/api/creators', (req, res) => {
  const creators = db.prepare('SELECT * FROM target_creators ORDER BY id DESC').all();
  res.json(creators);
});

app.post('/api/creators', (req, res) => {
  const { profileUrl, name, headline, category, autoEngage } = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO target_creators (profileUrl, name, headline, category, autoEngage)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(profileUrl, name, headline || null, category || null, autoEngage ? 1 : 0);
  res.json({ success: true });
});

app.delete('/api/creators/:id', (req, res) => {
  db.prepare('DELETE FROM target_creators WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/creators/:id/scan', async (req, res) => {
  try {
    const creator = db.prepare('SELECT * FROM target_creators WHERE id = ?').get(req.params.id) as any;
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    const postInfo = await scanCreatorRecentPost(creator.profileUrl);
    if (!postInfo || !postInfo.postText) {
      return res.json({ success: false, message: 'No recent readable post found on creator profile.' });
    }

    // Auto draft a comment
    const commentResult = await generateCommentDraft({
      postAuthor: postInfo.authorName || creator.name,
      postText: postInfo.postText
    });

    // Add to review queue
    db.prepare(`
      INSERT INTO queue (type, content, title, targetUrl, targetName, metadata, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      'comment',
      commentResult.comment,
      `Comment on ${creator.name}'s latest post`,
      postInfo.postUrl,
      creator.name,
      JSON.stringify({
        postSnippet: postInfo.postText.slice(0, 200),
        audit: commentResult.audit
      })
    );

    db.prepare('UPDATE target_creators SET lastScannedAt = datetime("now") WHERE id = ?').run(creator.id);
    res.json({ success: true, message: `Drafted comment on ${creator.name}'s post and queued for review!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prospects', (req, res) => {
  const prospects = db.prepare('SELECT * FROM prospects ORDER BY id DESC').all();
  res.json(prospects);
});

app.post('/api/prospects', (req, res) => {
  const { profileUrl, name, headline, company, notes } = req.body;
  const insert = db.prepare(`
    INSERT OR REPLACE INTO prospects (profileUrl, name, headline, company, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(profileUrl, name, headline || null, company || null, notes || null);
  res.json({ success: true });
});

app.delete('/api/prospects/:id', (req, res) => {
  db.prepare('DELETE FROM prospects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Settings & Activity Logs
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, any> = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  }
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const updates = req.body;
  for (const [k, v] of Object.entries(updates)) {
    setSetting(k, v);
  }
  logActivity('Updated system configuration and settings', 'system', 'info');
  res.json({ success: true });
});

app.get('/api/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 100').all();
  res.json(logs);
});

// Serve frontend dist if built
const DIST_PATH = fs.existsSync(path.resolve(process.cwd(), 'src/frontend/dist/client'))
  ? path.resolve(process.cwd(), 'src/frontend/dist/client')
  : path.resolve(process.cwd(), 'dist/client');

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`LinkedIn Automation Backend running on http://localhost:${PORT}`);
});
