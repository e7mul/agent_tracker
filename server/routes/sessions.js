const { Router } = require('express');
const { getSessions } = require('../db');

module.exports = function makeSessionsRouter({ db, token }) {
  const router = Router();

  router.get('/', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(getSessions(db));
  });

  return router;
};
