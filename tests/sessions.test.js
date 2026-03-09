const request = require('supertest');
const express = require('express');
const { createDb, upsertSession } = require('../server/db');
const makeSessionsRouter = require('../server/routes/sessions');

const TOKEN = 'test-token';
let app, db;

beforeEach(() => {
  db = createDb(':memory:');
  app = express();
  app.use(express.json());
  app.use('/api/sessions', makeSessionsRouter({ db, token: TOKEN }));
});

afterEach(() => db.close());

test('GET /api/sessions returns 401 without token', async () => {
  const res = await request(app).get('/api/sessions');
  expect(res.status).toBe(401);
});

test('GET /api/sessions returns empty array when no sessions', async () => {
  const res = await request(app)
    .get('/api/sessions')
    .set('Authorization', `Bearer ${TOKEN}`);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});

test('GET /api/sessions returns inserted sessions', async () => {
  upsertSession(db, {
    session_id: 's1', machine_id: 'm1', machine_hostname: 'host',
    project_name: 'proj', project_path: '/proj', git_branch: 'main',
    git_repo: '', status: 'idle', context_pct: 20, notification_message: ''
  });
  const res = await request(app)
    .get('/api/sessions')
    .set('Authorization', `Bearer ${TOKEN}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].session_id).toBe('s1');
});
