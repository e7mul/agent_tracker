const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const { createWsManager } = require('../server/ws');

const TOKEN = 'test-token';

function makeServer() {
  const app = express();
  const server = http.createServer(app);
  const { broadcast } = createWsManager({ server, token: TOKEN });
  return { server, broadcast };
}

function connectClient(server, token = TOKEN) {
  const addr = server.address();
  return new WebSocket(`ws://127.0.0.1:${addr.port}/ws?token=${token}`);
}

test('client connects and receives broadcast', done => {
  const { server, broadcast } = makeServer();
  server.listen(0, () => {
    const ws = connectClient(server);
    ws.on('open', () => {
      broadcast([{ session_id: 's1' }]);
    });
    ws.on('message', raw => {
      const data = JSON.parse(raw);
      expect(data).toEqual([{ session_id: 's1' }]);
      ws.close();
      server.close(done);
    });
  });
});

test('client with wrong token is rejected', done => {
  const { server } = makeServer();
  server.listen(0, () => {
    const ws = connectClient(server, 'wrong');
    ws.on('close', code => {
      expect(code).toBe(4401);
      server.close(done);
    });
  });
});
