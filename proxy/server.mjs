import http from 'node:http';
import { pipeline } from 'node:stream';

// Destino fijo: este servicio solamente retransmite Radio Noventa.
const streamUrl = 'http://www.radionoventa.com.ar:8000/Noventa_en_vivo.mp3';
export const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (req.url !== '/noventa.mp3' || req.method !== 'GET') {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader('Cache-Control', 'no-store');
  const upstream = http.get(`${streamUrl}?t=${Date.now()}`, {
    agent: false,
    headers: { 'Icy-MetaData': '0', 'User-Agent': 'RadiosVR/1.0', Accept: '*/*' }
  }, source => {
    if (source.statusCode !== 200 || !source.headers['content-type']?.startsWith('audio/')) {
      source.destroy();
      res.writeHead(502);
      return res.end('La transmisión no está disponible');
    }
    res.writeHead(200, { 'Content-Type': source.headers['content-type'], 'X-Accel-Buffering': 'no' });
    pipeline(source, res, () => upstream.destroy());
  });
  upstream.setTimeout(15000, () => upstream.destroy(new Error('Stream timeout')));
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('No se pudo conectar con la radio');
    } else res.destroy();
  });
  res.on('close', () => upstream.destroy());
});
server.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
