import { setupTestDb, resetTestDb, teardownTestDb } from './helpers/db.js';
import { getApp } from './helpers/app.js';
import request from 'supertest';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });

let token;
beforeEach(async () => {
  await resetTestDb();
  const app = await getApp();
  const r = await request(app).post('/api/auth/signup').send({
    email: 'me@example.com', password: 'correctpassword123',
  });
  token = r.body.token;
});

describe('tab sessions', () => {
  test('Create -> Get with tabs -> Delete', async () => {
    const app = await getApp();
    const created = await request(app).post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Research',
        description: 'Looking into self-hosted stuff',
        tabs: [
          { url: 'https://github.com', title: 'GitHub' },
          { url: 'https://news.ycombinator.com', title: 'HN' },
        ],
      });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Research');

    const detail = await request(app).get(`/api/sessions/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.tabs).toHaveLength(2);
    expect(detail.body.tabs[0].url).toBe('https://github.com');

    const del = await request(app).delete(`/api/sessions/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/sessions').set('Authorization', `Bearer ${token}`);
    expect(list.body).toHaveLength(0);
  });
});
