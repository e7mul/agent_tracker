const { createDb, upsertSession, getSessions, markStaleSessions } = require('../server/db');

let db;

beforeEach(() => {
  db = createDb(':memory:');
});

afterEach(() => {
  db.close();
});

test('upsertSession inserts a new session', () => {
  upsertSession(db, {
    session_id: 'sess-1',
    machine_id: 'mac-1',
    machine_hostname: 'myhost',
    project_name: 'my-project',
    project_path: '/home/user/my-project',
    git_branch: 'main',
    git_repo: 'https://github.com/user/repo',
    status: 'working',
    context_pct: 42,
    notification_message: ''
  });
  const rows = getSessions(db);
  expect(rows).toHaveLength(1);
  expect(rows[0].session_id).toBe('sess-1');
  expect(rows[0].status).toBe('working');
});

test('upsertSession updates an existing session', () => {
  const payload = {
    session_id: 'sess-1', machine_id: 'm', machine_hostname: 'h',
    project_name: 'p', project_path: '/p', git_branch: 'main',
    git_repo: '', status: 'working', context_pct: 10, notification_message: ''
  };
  upsertSession(db, payload);
  upsertSession(db, { ...payload, status: 'idle', context_pct: 55 });
  const rows = getSessions(db);
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('idle');
  expect(rows[0].context_pct).toBe(55);
});

test('markStaleSessions sets status to stopped for old sessions', () => {
  upsertSession(db, {
    session_id: 'old', machine_id: 'm', machine_hostname: 'h',
    project_name: 'p', project_path: '/p', git_branch: 'main',
    git_repo: '', status: 'working', context_pct: 0, notification_message: ''
  });
  // Manually backdate the last_heartbeat to 10 minutes ago
  const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
  db.prepare('UPDATE sessions SET last_heartbeat = ? WHERE session_id = ?')
    .run(tenMinutesAgo, 'old');
  markStaleSessions(db, 5);
  const rows = getSessions(db);
  expect(rows[0].status).toBe('stopped');
});

test('getSessions returns sessions from last 24 hours only', () => {
  upsertSession(db, {
    session_id: 'recent', machine_id: 'm', machine_hostname: 'h',
    project_name: 'p', project_path: '/p', git_branch: 'main',
    git_repo: '', status: 'idle', context_pct: 0, notification_message: ''
  });
  const rows = getSessions(db);
  expect(rows).toHaveLength(1);
});
