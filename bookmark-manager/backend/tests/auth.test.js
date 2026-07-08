import { setupTestDb, resetTestDb, teardownTestDb } from './helpers/db.js';
import { getApp } from './helpers/app.js';
import request from 'supertest';

beforeAll(async () => { await setupTestDb(); });
beforeEach(async () => { await resetTestDb(); });
afterAll(async () => { await teardownTestDb(); });

describe('auth flow', () => {
  test('GET /api/health is public', async () => {
    const app = await getApp();
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(typeof r.body.auth_enabled).toBe('boolean');
  });

  test('GET /api/auth/status reports needs_setup=true on a fresh DB', async () => {
    const app = await getApp();
    const r = await request(app).get('/api/auth/status');
    expect(r.status).toBe(200);
    expect(r.body.auth_enabled).toBe(true);
    expect(r.body.needs_setup).toBe(true);
  });

  test('POST /api/auth/signup creates the first user and returns a JWT', async () => {
    const app = await getApp();
    const r = await request(app).post('/api/auth/signup').send({
      email: 'me@example.com',
      password: 'correctpassword123',
      display_name: 'Me',
    });
    expect(r.status).toBe(201);
    expect(r.body.token).toMatch(/^eyJ/);
    expect(r.body.user.email).toBe('me@example.com');
    expect(r.body.user.password_hash).toBeUndefined();
  });

  test('POST /api/auth/signup REJECTS a weak password', async () => {
    const app = await getApp();
    const r = await request(app).post('/api/auth/signup').send({
      email: 'me@example.com', password: 'short',
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/at least 8 characters/i);
  });

  test('POST /api/auth/signup is BLOCKED once a user exists', async () => {
    const app = await getApp();
    await request(app).post('/api/auth/signup').send({
      email: 'me@example.com', password: 'correctpassword123',
    });
    const r2 = await request(app).post('/api/auth/signup').send({
      email: 'other@example.com', password: 'anotherpassword12',
    });
    expect(r2.status).toBe(409);
  });

  test('POST /api/auth/login accepts correct credentials, rejects bad ones', async () => {
    const app = await getApp();
    await request(app).post('/api/auth/signup').send({
      email: 'me@example.com', password: 'correctpassword123',
    });
    const ok = await request(app).post('/api/auth/login').send({
      email: 'me@example.com', password: 'correctpassword123',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();

    const bad = await request(app).post('/api/auth/login').send({
      email: 'me@example.com', password: 'wrong-password',
    });
    expect(bad.status).toBe(401);
  });

  test('Protected route /api/bookmarks rejects requests without a token', async () => {
    const app = await getApp();
    const r = await request(app).get('/api/bookmarks');
    expect(r.status).toBe(401);
  });

  test('Protected route accepts a valid JWT', async () => {
    const app = await getApp();
    const { body } = await request(app).post('/api/auth/signup').send({
      email: 'me@example.com', password: 'correctpassword123',
    });
    const r = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.token}`);
    expect(r.status).toBe(200);
    expect(r.body.user.email).toBe('me@example.com');
    expect(r.body.auth_method).toBe('jwt');
  });
});

describe('personal access tokens', () => {
  let token;
  beforeEach(async () => {
    const app = await getApp();
    const { body } = await request(app).post('/api/auth/signup').send({
      email: 'me@example.com', password: 'correctpassword123',
    });
    token = body.token;
  });

  test('Can create + list + use + revoke a PAT', async () => {
    const app = await getApp();

    // Create
    const create = await request(app).post('/api/auth/tokens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'extension' });
    expect(create.status).toBe(201);
    const pat = create.body.token;
    expect(pat).toMatch(/^bmpat_[a-f0-9]+/);
    expect(create.body.token_prefix).toBe(pat.slice(0, 12));

    // List
    const list = await request(app).get('/api/auth/tokens')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('extension');

    // Use the PAT itself to call /me
    const meWithPat = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${pat}`);
    expect(meWithPat.status).toBe(200);
    expect(meWithPat.body.auth_method).toBe('pat');

    // Revoke
    const id = list.body[0].id;
    const del = await request(app).delete(`/api/auth/tokens/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    // Revoked PAT no longer works
    const meRevoked = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${pat}`);
    expect(meRevoked.status).toBe(401);
  });
});
