const { WebSocketServer } = require('ws');

function createWsManager({ server, token }) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.searchParams.get('token') !== token) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    const ping = setInterval(() => {
      if (ws.readyState === ws.OPEN) ws.ping();
    }, 30000);

    ws.on('close', () => clearInterval(ping));
  });

  function broadcast(sessions) {
    const msg = JSON.stringify(sessions);
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) client.send(msg);
    });
  }

  return { broadcast };
}

module.exports = { createWsManager };
