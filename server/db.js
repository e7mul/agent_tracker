const Database = require('better-sqlite3');

function createDb(path = './data.db') {
  const db = new Database(path);
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id          TEXT PRIMARY KEY,
      machine_id          TEXT,
      machine_hostname    TEXT,
      project_name        TEXT,
      project_path        TEXT,
      git_branch          TEXT,
      git_repo            TEXT,
      status              TEXT,
      context_pct         INTEGER,
      notification_message TEXT,
      last_heartbeat      INTEGER,
      created_at          INTEGER
    )
  `).run();
  return db;
}

function upsertSession(db, data) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO sessions
      (session_id, machine_id, machine_hostname, project_name, project_path,
       git_branch, git_repo, status, context_pct, notification_message,
       last_heartbeat, created_at)
    VALUES
      (@session_id, @machine_id, @machine_hostname, @project_name, @project_path,
       @git_branch, @git_repo, @status, @context_pct, @notification_message,
       ${now}, ${now})
    ON CONFLICT(session_id) DO UPDATE SET
      machine_id           = excluded.machine_id,
      machine_hostname     = excluded.machine_hostname,
      project_name         = excluded.project_name,
      project_path         = excluded.project_path,
      git_branch           = excluded.git_branch,
      git_repo             = excluded.git_repo,
      status               = excluded.status,
      context_pct          = excluded.context_pct,
      notification_message = excluded.notification_message,
      last_heartbeat       = excluded.last_heartbeat
  `).run(data);
}

function getSessions(db) {
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  return db.prepare(`
    SELECT * FROM sessions
    WHERE last_heartbeat > ?
    ORDER BY last_heartbeat DESC
  `).all(cutoff);
}

function markStaleSessions(db, ttlMinutes) {
  const cutoff = Math.floor(Date.now() / 1000) - ttlMinutes * 60;
  db.prepare(`
    UPDATE sessions SET status = 'stopped'
    WHERE last_heartbeat < ? AND status != 'stopped'
  `).run(cutoff);
}

module.exports = { createDb, upsertSession, getSessions, markStaleSessions };
