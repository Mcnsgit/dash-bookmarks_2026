// Single-process app instance for tests. Imported AFTER setupTestDb()
// so that env vars are in place when db.js / auth.js read them.
let appPromise = null;

export async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { buildApp } = await import('../../src/app.js');
      return buildApp({ logger: false });
    })();
  }
  return appPromise;
}
