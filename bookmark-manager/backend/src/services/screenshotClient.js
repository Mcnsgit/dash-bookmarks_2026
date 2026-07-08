// Talks to the screenshot microservice.
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const SVC = process.env.SCREENSHOT_SERVICE_URL || 'http://screenshot:5000';
const DIR = process.env.SCREENSHOTS_DIR || '/screenshots';

export async function captureScreenshot(bookmarkId, url) {
  try {
    await fs.mkdir(DIR, { recursive: true });
    const file = path.join(DIR, `${bookmarkId}.png`);

    const res = await axios.post(`${SVC}/screenshot`, { url }, {
      timeout: 60000,
      responseType: 'arraybuffer',
    });

    await fs.writeFile(file, res.data);
    return `/screenshots/${bookmarkId}.png`;
  } catch (e) {
    console.warn(`[screenshot] failed for ${url}:`, e.message);
    return null;
  }
}
