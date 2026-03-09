const request = require('supertest');
const express = require('express');
const { createDb } = require('../server/db');
const makeHeartbeatRouter = require('../server/routes/heartbeat');

const TOKEN = 'test-token';
let app, db;

beforeEach(() => {
  db = createDb(':memory:');
  const broadcast = jest.fn();
  app = express();
  app.use(express.json());
  app.use('/api/heartbeat', makeHeartbeatRouter({ db, token: TOKEN, broadcast }));
});

afterEach(() => db.close());

const validPayload = {
  session_id: 's1', machine_id: 'm1', machine_hostname: 'host',
  project_name: 'proj', project_path: '/proj', git_branch: 'main',
  git_repo: '', status: 'working', context_pct: 0, notification_message: ''
};

test('POST /api/heartbeat returns 200 with valid token', async () => {
  const res = await request(app)
    .post('/api/heartbeat')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send(validPayload);
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('POST /api/heartbeat returns 401 with missing token', async () => {
  const res = await request(app)
    .post('/api/heartbeat')
    .send(validPayload);
  expect(res.status).toBe(401);
});

test('POST /api/heartbeat returns 401 with wrong token', async () => {
  const res = await request(app)
    .post('/api/heartbeat')
    .set('Authorization', 'Bearer wrong-token')
    .send(validPayload);
  expect(res.status).toBe(401);
});

test('POST /api/heartbeat returns 400 when session_id missing', async () => {
  const { session_id, ...bad } = validPayload;
  const res = await request(app)
    .post('/api/heartbeat')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send(bad);
  expect(res.status).toBe(400);
});

test('POST /api/heartbeat calls broadcast after upsert', async () => {
  const broadcast = jest.fn();
  const app2 = express();
  app2.use(express.json());
  app2.use('/api/heartbeat', makeHeartbeatRouter({ db, token: TOKEN, broadcast }));
  await request(app2)
    .post('/api/heartbeat')
    .set('Authorization', `Bearer ${TOKEN}`)
    .send(validPayload);
  expect(broadcast).toHaveBeenCalledTimes(1);
});
