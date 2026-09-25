import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'linkedin_auto.db');
export const db = new Database(DB_PATH);

// Pragmas for performance and concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'post' | 'connection' | 'comment' | 'dm'
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'dispatched' | 'failed'
      targetUrl TEXT,
      targetName TEXT,
      title TEXT,
      content TEXT NOT NULL,
      metadata TEXT, -- JSON string
      scheduledFor TEXT,
      dispatchedAt TEXT,
      error TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileUrl TEXT UNIQUE NOT NULL,
      name TEXT,
      headline TEXT,
      company TEXT,
      status TEXT NOT NULL DEFAULT 'discovered', -- 'discovered' | 'queued' | 'connected' | 'messaged' | 'archived'
      notes TEXT,
      lastContactedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS target_creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profileUrl TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      headline TEXT,
      category TEXT,
      autoEngage INTEGER NOT NULL DEFAULT 1,
      lastScannedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system', -- 'connection' | 'comment' | 'post' | 'system' | 'session'
      status TEXT NOT NULL DEFAULT 'info', -- 'success' | 'warning' | 'error' | 'info'
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default settings if not already present
  const defaultSettings: Record<string, any> = {
    aiProvider: 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    persona: {
      name: 'Vinay',
      role: 'Tech Founder & Engineering Leader',
      industry: 'Software, AI & Automation',
      bio: 'Building production systems, high-leverage automation, and resilient software architectures.',
      toneKeywords: ['sharp', 'candid', 'metric-driven', 'practical', 'no-nonsense'],
      bannedWords: ['delve', 'testament', 'revolutionize', 'fast-paced world', 'game-changer', 'tapestry', 'synergy'],
      samplePosts: []
    },
    rateLimits: {
      maxConnectionsPerDay: 15,
      maxCommentsPerDay: 20,
      maxPostsPerDay: 2,
      minDelaySeconds: 60,
      maxDelaySeconds: 180
    },
    workingHours: {
      startHour: 9,
      endHour: 18,
      activeDays: [1, 2, 3, 4, 5] // Mon-Fri
    },
    linkedinApp: {
      clientId: '',
      clientSecret: '',
      accessToken: '',
      redirectUri: 'http://localhost:3000/api/auth/linkedin/callback'
    },
    autoSchedule: false,
    useOfficialApiForPosts: false
  };

  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(defaultSettings)) {
    const existing = getStmt.get(key);
    if (!existing) {
      setStmt.run(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
  }
}

export function getSetting<T = any>(key: string, defaultValue?: T): T {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return defaultValue as T;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export function setSetting(key: string, value: any): void {
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, str);
}

export function logActivity(action: string, type: string, status: 'success' | 'warning' | 'error' | 'info', details?: string) {
  db.prepare('INSERT INTO activity_logs (action, type, status, details) VALUES (?, ?, ?, ?)').run(
    action,
    type,
    status,
    details || null
  );
}

// Today's action counts
export function getDailyQuotaUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT type, count(*) as count
    FROM activity_logs
    WHERE status = 'success'
      AND timestamp >= ?
      AND type IN ('connection', 'comment', 'post')
    GROUP BY type
  `).all(`${today}T00:00:00`) as Array<{ type: string; count: number }>;

  const counts: Record<string, number> = { connection: 0, comment: 0, post: 0 };
  for (const r of rows) {
    counts[r.type] = r.count;
  }
  return counts;
}
