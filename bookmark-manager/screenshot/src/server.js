// Minimal Puppeteer-based screenshot microservice.
import express from 'express';
import puppeteer from 'puppeteer-core';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = parseInt(process.env.PORT || '5000', 10);
const EXEC = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

let browser = null;
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await puppeteer.launch({
    executablePath: EXEC,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  });
  return browser;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/screenshot', async (req, res) => {
  const { url, width = 1280, height = 800, fullPage = false } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  let page;
  try {
    const br = await getBrowser();
    page = await br.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 800));
    const buf = await page.screenshot({
      type: 'png',
      fullPage,
      clip: fullPage ? undefined : { x: 0, y: 0, width, height },
    });
    res.set('Content-Type', 'image/png').send(buf);
  } catch (e) {
    console.warn('[screenshot] error', url, e.message);
    res.status(500).json({ error: e.message });
  } finally {
    try { if (page) await page.close({ runBeforeUnload: false }); } catch {}
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`[screenshot] listening on :${PORT}`));

process.on('SIGTERM', async () => { try { await browser?.close(); } catch {}; process.exit(0); });
