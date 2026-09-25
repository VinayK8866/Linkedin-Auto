import { getSetting, logActivity } from './db.js';
import { publishPostViaBrowser } from './automation.js';

export async function publishPost(text: string): Promise<{ success: boolean; method: 'official_api' | 'stealth_browser'; message: string }> {
  const useOfficial = getSetting<boolean>('useOfficialApiForPosts', false);
  const appConfig = getSetting('linkedinApp', { accessToken: '' });

  if (useOfficial && appConfig.accessToken) {
    try {
      // Fetch user profile URN first if needed
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${appConfig.accessToken}` }
      });
      if (!userRes.ok) {
        throw new Error(`LinkedIn Userinfo failed with status ${userRes.status}`);
      }
      const userData = await userRes.json();
      const personUrn = `urn:li:person:${userData.sub}`;

      // Publish UGC Post
      const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appConfig.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`LinkedIn API post creation failed (${postRes.status}): ${errText}`);
      }

      logActivity('Published post via official LinkedIn API', 'post', 'success');
      return { success: true, method: 'official_api', message: 'Published successfully via official LinkedIn Share API.' };
    } catch (err: any) {
      logActivity(`Official API failed, falling back to stealth browser: ${err.message}`, 'post', 'warning');
      const fallbackResult = await publishPostViaBrowser(text);
      return { ...fallbackResult, method: 'stealth_browser' };
    }
  }

  // Fallback / default to stealth browser
  const browserResult = await publishPostViaBrowser(text);
  return { ...browserResult, method: 'stealth_browser' };
}
