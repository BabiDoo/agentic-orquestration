import http from 'node:http';
import { handleFetchRequest } from './api.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url || '/', `${protocol}://${host}`);

    let bodyBuffer: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      bodyBuffer = Buffer.concat(chunks);
    }

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) {
        for (const v of val) headers.append(key, v);
      } else if (val !== undefined) {
        headers.set(key, val);
      }
    }

    const isBodyAllowed = req.method !== 'GET' && req.method !== 'HEAD';
    const requestInit: RequestInit & { duplex?: string } = {
      method: req.method,
      headers
    };

    if (isBodyAllowed && bodyBuffer && bodyBuffer.length > 0) {
      requestInit.body = new Uint8Array(bodyBuffer);
      requestInit.duplex = 'half';
    }

    const request = new Request(url.toString(), requestInit);
    const response = await handleFetchRequest(request);

    res.statusCode = response.status;
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (response.body) {
      const reader = response.body.getReader();
      let streamOpen = true;
      while (streamOpen) {
        const { done, value } = await reader.read();
        if (done) {
          streamOpen = false;
          break;
        }
        res.write(value);
      }
    }
    res.end();
  } catch (err: unknown) {
    console.error('[Server Error]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : String(err)
      })
    );
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 AdzHub Microkernel Harness running on http://${HOST}:${PORT}`);
});
