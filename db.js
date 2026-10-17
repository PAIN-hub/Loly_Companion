import fs from 'node:fs';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  if (process.env.LOLY_DB_PATH) {
    return process.env.LOLY_DB_PATH;
  }
  // When running inside packaged Electron (app.asar) or Electron runtime
  if (process.versions.electron || __dirname.includes('app.asar')) {
    const dataDir = path.join(os.homedir(), '.loly');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (_) {}
    }
    const targetDb = path.join(dataDir, 'loly.db');
    const localDb = path.join(__dirname, 'loly.db');
    if (!fs.existsSync(targetDb) && fs.existsSync(localDb)) {
      try {
        fs.copyFileSync(localDb, targetDb);
      } catch (_) {}
    }
    return targetDb;
  }
  return path.join(__dirname, 'loly.db');
}

const dbPath = resolveDbPath();

export class AppDatabase {
  constructor() {
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        prompt TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        agent_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        agent_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  createOrUpdateSession(sessionId, agentName, prompt = '') {
    const checkStmt = this.db.prepare('SELECT id FROM sessions WHERE id = ?');
    const existing = checkStmt.get(sessionId);
    const now = new Date().toISOString();

    if (existing) {
      const updateStmt = this.db.prepare("UPDATE sessions SET status = 'active', ended_at = NULL WHERE id = ?");
      updateStmt.run(sessionId);
    } else {
      const insertStmt = this.db.prepare("INSERT INTO sessions (id, agent_name, status, prompt, started_at) VALUES (?, ?, 'active', ?, ?)");
      insertStmt.run(sessionId, agentName, prompt, now);
    }
  }

  endSession(sessionId) {
    const stmt = this.db.prepare("UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?");
    stmt.run(new Date().toISOString(), sessionId);
  }

  logEvent(sessionId, agentName, eventType, title, details = '') {
    const stmt = this.db.prepare(
      'INSERT INTO events (session_id, agent_name, event_type, title, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(sessionId, agentName, eventType, title, details, new Date().toISOString());
  }

  createApproval(id, sessionId, agentName, actionType, target) {
    const stmt = this.db.prepare(
      "INSERT INTO approvals (id, session_id, agent_name, action_type, target, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)"
    );
    stmt.run(id, sessionId, agentName, actionType, target, new Date().toISOString());
  }

  resolveApproval(id, decision) {
    const stmt = this.db.prepare('UPDATE approvals SET status = ?, resolved_at = ? WHERE id = ?');
    stmt.run(decision, new Date().toISOString(), id);
  }

  getRecentEvents(limit = 30) {
    const stmt = this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?');
    return stmt.all(limit);
  }

  getStats() {
    const sessionsCount = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    const eventsCount = this.db.prepare('SELECT COUNT(*) as count FROM events').get();
    const approvalsCount = this.db.prepare("SELECT COUNT(*) as count FROM approvals WHERE status != 'pending'").get();
    return {
      totalSessions: sessionsCount.count,
      totalEvents: eventsCount.count,
      totalApprovals: approvalsCount.count
    };
  }

  addChatMessage(role, content) {
    const stmt = this.db.prepare('INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)');
    stmt.run(role, content, new Date().toISOString());
  }

  getRecentChat(limit = 20) {
    const stmt = this.db.prepare('SELECT * FROM chat_history ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(limit);
    return rows.reverse();
  }

  getSetting(key) {
    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get(key);
      return row ? row.value : null;
    } catch (_) {
      return null;
    }
  }

  setSetting(key, value) {
    try {
      const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      stmt.run(key, String(value));
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const db = new AppDatabase();
