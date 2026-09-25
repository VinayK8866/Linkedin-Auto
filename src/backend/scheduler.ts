import { db, getSetting, logActivity, getDailyQuotaUsage } from './db.js';
import { sendConnectionRequest, postCommentOnPost, sleep } from './automation.js';
import { publishPost } from './linkedin-api.js';

let isWorkerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

export function isWithinWorkingHours(): boolean {
  const config = getSetting('workingHours', {
    startHour: 9,
    endHour: 18,
    activeDays: [1, 2, 3, 4, 5]
  });

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (!config.activeDays.includes(day)) return false;
  if (hour < config.startHour || hour >= config.endHour) return false;
  return true;
}

export async function dispatchItem(queueItem: any): Promise<{ success: boolean; message: string }> {
  try {
    let result = { success: false, message: 'Unknown type' };

    if (queueItem.type === 'post') {
      result = await publishPost(queueItem.content);
    } else if (queueItem.type === 'connection') {
      result = await sendConnectionRequest(queueItem.targetUrl, queueItem.content);
    } else if (queueItem.type === 'comment') {
      result = await postCommentOnPost(queueItem.targetUrl, queueItem.content);
    }

    if (result.success) {
      db.prepare(`
        UPDATE queue 
        SET status = 'dispatched', dispatchedAt = datetime('now'), error = NULL, updatedAt = datetime('now')
        WHERE id = ?
      `).run(queueItem.id);
    } else {
      db.prepare(`
        UPDATE queue 
        SET status = 'failed', error = ?, updatedAt = datetime('now')
        WHERE id = ?
      `).run(result.message, queueItem.id);
    }

    return result;
  } catch (err: any) {
    db.prepare(`
      UPDATE queue 
      SET status = 'failed', error = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(err.message, queueItem.id);
    return { success: false, message: err.message };
  }
}

export async function dispatchNextApprovedItem(): Promise<{ dispatched: boolean; item?: any; message: string }> {
  if (isWorkerRunning) {
    return { dispatched: false, message: 'A dispatch worker is already actively processing.' };
  }

  const nextItem = db.prepare(`
    SELECT * FROM queue
    WHERE status = 'approved'
    ORDER BY id ASC
    LIMIT 1
  `).get() as any;

  if (!nextItem) {
    return { dispatched: false, message: 'No approved items in the queue waiting for dispatch.' };
  }

  isWorkerRunning = true;
  try {
    const res = await dispatchItem(nextItem);
    return { dispatched: res.success, item: nextItem, message: res.message };
  } finally {
    isWorkerRunning = false;
  }
}

export function startScheduler() {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    const autoSchedule = getSetting<boolean>('autoSchedule', false);
    if (!autoSchedule) return;

    if (!isWithinWorkingHours()) return;
    if (isWorkerRunning) return;

    const quotas = getDailyQuotaUsage();
    const limits = getSetting('rateLimits', {
      maxConnectionsPerDay: 15,
      maxCommentsPerDay: 20,
      maxPostsPerDay: 2,
      minDelaySeconds: 60,
      maxDelaySeconds: 180
    });

    const nextItem = db.prepare(`
      SELECT * FROM queue
      WHERE status = 'approved'
      ORDER BY id ASC
      LIMIT 1
    `).get() as any;

    if (!nextItem) return;

    if (nextItem.type === 'connection' && quotas.connection >= limits.maxConnectionsPerDay) return;
    if (nextItem.type === 'comment' && quotas.comment >= limits.maxCommentsPerDay) return;
    if (nextItem.type === 'post' && quotas.post >= limits.maxPostsPerDay) return;

    isWorkerRunning = true;
    try {
      logActivity(`Scheduler executing approved ${nextItem.type} #${nextItem.id}`, 'system', 'info');
      await dispatchItem(nextItem);

      // Randomized safety delay
      const delay = (limits.minDelaySeconds + Math.random() * (limits.maxDelaySeconds - limits.minDelaySeconds)) * 1000;
      await sleep(delay);
    } finally {
      isWorkerRunning = false;
    }
  }, 60000); // Check every 60 seconds
}
