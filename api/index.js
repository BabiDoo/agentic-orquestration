import { handleFetchRequest } from '../apps/web/dist/api.js';

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  // Suporte a Web Fetch Request (Edge / Standard Node.js Fetch)
  if (req instanceof Request || (req && typeof req.url === 'string' && !res)) {
    return handleFetchRequest(req);
  }

  // Suporte a Node.js Serverless Function (req, res)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  
  // Extrai o caminho original da requisição no Vercel (prioriza cabeçalhos de rewrite do Vercel)
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches'];
  let rawPath = matchedPath || req.url || '/';
  
  if (rawPath === '/api' || rawPath === '/api/index' || rawPath === '/api/index.js') {
    rawPath = '/';
  }

  // Se req.url contiver query string e rawPath não contiver, anexa
  if (req.url && req.url.includes('?') && !rawPath.includes('?')) {
    const queryPart = req.url.substring(req.url.indexOf('?'));
    rawPath += queryPart;
  }

  const fullUrl = `${protocol}://${host}${rawPath.startsWith('/') ? rawPath : '/' + rawPath}`;

  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  }

  const webRequest = new Request(fullUrl, {
    method: req.method,
    headers: req.headers,
    body
  });

  const webResponse = await handleFetchRequest(webRequest);

  res.statusCode = webResponse.status;
  webResponse.headers.forEach((val, key) => {
    res.setHeader(key, val);
  });

  const arrayBuffer = await webResponse.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
