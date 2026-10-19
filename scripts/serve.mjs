/**
 * Servidor estatico minimo, sem dependencia, para rodar o app em
 * http://localhost:5173 com o mesmo esquema do navegador (file:// muda o
 * comportamento de fetch/CORS e de alguns CDNs).
 *
 * Uso: npm run serve
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const PORTA = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const servidor = http.createServer((req, res) => {
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('URL invalida');
    return;
  }

  const alvo = path.join(RAIZ, caminho.endsWith('/') ? caminho + 'index.html' : caminho);

  // Nao sair da raiz do projeto.
  if (!alvo.startsWith(RAIZ)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Fora da raiz');
    return;
  }

  fs.readFile(alvo, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 - nao encontrado: ' + caminho);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(dados);
  });
});

servidor.listen(PORTA, () => {
  console.log(`SisAgri em http://localhost:${PORTA}`);
  console.log(`  publico : http://localhost:${PORTA}/index.html`);
  console.log(`  painel  : http://localhost:${PORTA}/admin.html`);
  console.log('Ctrl+C para parar.');
});
