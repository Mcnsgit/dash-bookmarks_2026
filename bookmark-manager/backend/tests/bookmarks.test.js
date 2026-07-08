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

const auth = (t) => `Bearer ${t}`;

describe('bookmarks CRUD', () => {
  test('Create -> List -> Update -> Archive -> Delete', async () => {
    const app = await getApp();

    // CREATE — use a localhost URL so the metadata fetch fails fast (no network).
    const created = await request(app).post('/api/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'http://127.0.0.1:65530/some-page', title: 'Test Bookmark', tags: ['dev', 'test'] });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe('Test Bookmark');
    expect(created.body.url_normalized).toContain('127.0.0.1');
    expect(created.body.tags).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'dev'  }),
      expect.objectContaining({ name: 'test' }),
    ]));
    const id = created.body.id;

    // LIST
    const list = await request(app).get('/api/bookmarks').set('Authorization', auth(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(id);

    // UPDATE
    const patched = await request(app).patch(`/api/bookmarks/${id}`)
      .set('Authorization', auth(token))
      .send({ title: 'Renamed', is_pinned: true });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe('Renamed');
    expect(patched.body.is_pinned).toBe(true);

    // ARCHIVE (toggle)
    const arch = await request(app).post(`/api/bookmarks/${id}/archive`)
      .set('Authorization', auth(token));
    expect(arch.status).toBe(200);
    const listAfterArchive = await request(app).get('/api/bookmarks').set('Authorization', auth(token));
    expect(listAfterArchive.body).toHaveLength(0);
    const listArchived = await request(app).get('/api/bookmarks?archived=true').set('Authorization', auth(token));
    expect(listArchived.body).toHaveLength(1);

    // DELETE
    const del = await request(app).delete(`/api/bookmarks/${id}`).set('Authorization', auth(token));
    expect(del.status).toBe(200);
    const empty = await request(app).get('/api/bookmarks?archived=all').set('Authorization', auth(token));
    expect(empty.body).toHaveLength(0);
  });
});

describe('folders', () => {
  test('Create folder, then a bookmark in that folder', async () => {
    const app = await getApp();
    const folder = await request(app).post('/api/folders')
      .set('Authorization', auth(token)).send({ name: 'Dev' });
    expect(folder.status).toBe(201);

    const bm = await request(app).post('/api/bookmarks')
      .set('Authorization', auth(token))
      .send({ url: 'http://127.0.0.1:65530/a', title: 'A', folder_id: folder.body.id });
    expect(bm.status).toBe(201);
    expect(bm.body.folder_id).toBe(folder.body.id);

    const inFolder = await request(app).get(`/api/bookmarks?folder_id=${folder.body.id}`)
      .set('Authorization', auth(token));
    expect(inFolder.body).toHaveLength(1);
  });
});
