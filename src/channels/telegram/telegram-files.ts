import { Agent, fetch as undiciFetch } from 'undici';

const FETCH_TIMEOUT_MS = 15 * 1000;

export async function downloadTelegramFile(
  botToken: string,
  filePath: string | undefined,
): Promise<Buffer> {
  if (!filePath) {
    throw new Error('Telegram did not return a file path');
  }

  const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const response = await undiciFetch(url, {
    dispatcher: new Agent({ connectTimeout: FETCH_TIMEOUT_MS }),
  });
  if (!response.ok) {
    throw new Error(`File download failed: HTTP ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}
