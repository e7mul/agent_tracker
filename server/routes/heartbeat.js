const { Router } = require('express');
const { upsertSession, getSessions } = require('../db');

const REQUIRED_FIELDS = [
  'session_id', 'machine_id', 'machine_hostname', 'project_name',
  'project_path', 'git_branch', 'git_repo', 'status', 'context_pct'
];

module.exports = function makeHeartbeatRouter({ db, token, broadcast }) {
  const router = Router();

  router.post('/', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const missing = REQUIRED_FIELDS.filter(f => req.body[f] === undefined);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    upsertSession(db, req.body);
    broadcast(getSessions(db));
    res.json({ ok: true });
  });

  return router;
};
