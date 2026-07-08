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

const NETSCAPE_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3 ADD_DATE="1700000000">Dev</H3>
  <DL><p>
    <DT><A HREF="https://github.com" TAGS="code,git">GitHub</A>
    <DT><A HREF="https://github.com/?utm_source=x">GitHub dupe</A>
    <DT><H3>Frameworks</H3>
    <DL><p>
      <DT><A HREF="https://react.dev">React</A>
      <DT><A HREF="https://vuejs.org">Vue.js</A>
    </DL><p>
  </DL><p>
  <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
</DL><p>`;

describe('import flow', () => {
  test('POST /api/import/analyze returns parsed list + duplicate report', async () => {
    const app = await getApp();
    const r = await request(app).post('/api/import/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(NETSCAPE_HTML), { filename: 'bookmarks.html', contentType: 'text/html' });
    expect(r.status).toBe(200);
    expect(r.body.list).toHaveLength(5);
    expect(r.body.list[0].folder).toBe('Dev');
    expect(r.body.list[0].tags).toEqual(['code', 'git']);
    expect(r.body.duplicates.duplicates_in_file).toBe(1);
  });

  test('POST /api/import/commit imports parsed bookmarks and skips duplicates', async () => {
    const app = await getApp();
    const analyze = await request(app).post('/api/import/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(NETSCAPE_HTML), { filename: 'bookmarks.html' });
    expect(analyze.status).toBe(200);

    const commit = await request(app).post('/api/import/commit')
      .set('Authorization', `Bearer ${token}`)
      .send({ list: analyze.body.list, options: { skipDuplicates: true, fetchMetadata: false, captureScreenshots: false } });
    expect(commit.status).toBe(200);
    expect(commit.body.imported).toBe(4);          // 5 entries minus 1 in-file dup
    expect(commit.body.duplicates).toBe(1);

    const bookmarks = await request(app).get('/api/bookmarks?limit=20')
      .set('Authorization', `Bearer ${token}`);
    expect(bookmarks.body).toHaveLength(4);
    const titles = bookmarks.body.map((b) => b.title).sort();
    expect(titles).toEqual(['GitHub', 'Hacker News', 'React', 'Vue.js']);

    // Folder hierarchy was created
    const folders = await request(app).get('/api/folders')
      .set('Authorization', `Bearer ${token}`);
    const names = folders.body.map((f) => f.name).sort();
    expect(names).toEqual(expect.arrayContaining(['Dev', 'Frameworks']));
  });
});
