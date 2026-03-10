require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createDb, getSessions, markStaleSessions } = require('./db');
const makeHeartbeatRouter = require('./routes/heartbeat');
const makeSessionsRouter = require('./routes/sessions');
const { createWsManager } = require('./ws');

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DASHBOARD_TOKEN;
const TTL = parseInt(process.env.SESSION_TTL_MINUTES || '5', 10);

if (!TOKEN) {
  console.error('DASHBOARD_TOKEN env var is required');
  process.exit(1);
}

const dbDir = process.env.DB_DIR || path.join(__dirname, '..');
const db = createDb(path.join(dbDir, 'data.db'));
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const { broadcast } = createWsManager({ server, token: TOKEN });

app.use('/api/heartbeat', makeHeartbeatRouter({ db, token: TOKEN, broadcast }));
app.use('/api/sessions', makeSessionsRouter({ db, token: TOKEN }));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

setInterval(() => {
  markStaleSessions(db, TTL);
  broadcast(getSessions(db));
}, 60_000);

server.listen(PORT, () => {
  console.log(`Agent dashboard running on http://localhost:${PORT}`);
});
