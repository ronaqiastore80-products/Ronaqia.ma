/**
 * Serveur local UNIQUEMENT — développement + panneau admin
 * Démarrage: node server.js  (ou DEMARRER.bat)
 * Admin: http://localhost:3000/admin.html
 *
 * Le site public (index.html) lit data/packs.json et data/config.json
 * en statique — compatible GitHub Pages sans Node.js.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PACKS_FILE = path.join(DATA_DIR, 'packs.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

const sessions = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const BLOCKED_STATIC = new Set([
  '/data/admin.json',
  'data/admin.json'
]);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readPublicConfig() {
  return readJson(CONFIG_FILE, { whatsapp: '212600000000' });
}

function savePublicConfig(config) {
  writeJson(CONFIG_FILE, { whatsapp: String(config.whatsapp || '').replace(/\D/g, '') });
}

function readAdminConfig() {
  return readJson(ADMIN_FILE, {
    adminUsername: 'admin',
    adminPasswordHash: hashPassword('admin123'),
    sessionSecret: 'change-this-secret-in-production'
  });
}

function saveAdminConfig(config) {
  writeJson(ADMIN_FILE, config);
}

function readConfig() {
  const pub = readPublicConfig();
  const adm = readAdminConfig();
  return { ...pub, ...adm };
}

function readPacks() {
  return readJson(PACKS_FILE, { packs: [] });
}

function savePacks(data) {
  writeJson(PACKS_FILE, data);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes('$')) return false;
  const [salt, hash] = stored.split('$');
  const verify = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
  } catch { return false; }
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { created: Date.now() });
  return token;
}

function isAuthenticated(req) {
  const token = getCookie(req, 'session');
  if (!token || !sessions.has(token)) return false;
  const s = sessions.get(token);
  if (Date.now() - s.created > 86400000) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2e6) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' && !headers['Content-Type']
      ? 'application/json; charset=utf-8' : (headers['Content-Type'] || 'application/json; charset=utf-8'),
    ...headers
  });
  res.end(payload);
}

function sanitizePack(body, existing) {
  const pack = existing ? { ...existing } : {};
  if (body.name !== undefined) pack.name = String(body.name).trim();
  if (body.subtitle !== undefined) pack.subtitle = String(body.subtitle).trim();
  if (body.description !== undefined) pack.description = String(body.description).trim();
  if (body.image !== undefined) pack.image = String(body.image).trim();
  if (body.price !== undefined) pack.price = String(body.price).trim();
  if (body.topBadge !== undefined) pack.topBadge = String(body.topBadge).trim();
  if (body.cadeauTag !== undefined) pack.cadeauTag = String(body.cadeauTag).trim();
  if (body.giftPosition !== undefined) pack.giftPosition = String(body.giftPosition).trim();
  if (body.detailId !== undefined) pack.detailId = body.detailId ? String(body.detailId).trim() : null;
  if (body.enabled !== undefined) pack.enabled = Boolean(body.enabled);
  if (body.sortOrder !== undefined) pack.sortOrder = Number(body.sortOrder) || 0;
  if (body.promotion !== undefined) {
    pack.promotion = {
      active: Boolean(body.promotion.active),
      text: String(body.promotion.text || '').trim(),
      badgeColor: String(body.promotion.badgeColor || '#2d6a4f').trim()
    };
  }
  return pack;
}

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function migrateLegacyConfig() {
  if (fs.existsSync(ADMIN_FILE)) return;

  const legacy = readJson(CONFIG_FILE, {});
  if (legacy.adminUsername || legacy.adminPasswordHash) {
    saveAdminConfig({
      adminUsername: legacy.adminUsername || 'admin',
      adminPasswordHash: legacy.adminPasswordHash || hashPassword('admin123'),
      sessionSecret: legacy.sessionSecret || 'change-this-secret-in-production'
    });
    savePublicConfig({ whatsapp: legacy.whatsapp || '212600000000' });
    console.log('Migration: identifiants admin déplacés vers data/admin.json (fichier local, non publié)');
  } else {
    saveAdminConfig({
      adminUsername: 'admin',
      adminPasswordHash: hashPassword('admin123'),
      sessionSecret: 'change-this-secret-in-production'
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    /* ── API locale (admin uniquement) ── */
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const config = readConfig();
      if (body.username !== config.adminUsername || !verifyPassword(body.password, config.adminPasswordHash)) {
        return send(res, 401, { error: 'Identifiants incorrects' });
      }
      const token = createSession();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `session=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      });
      return res.end(JSON.stringify({ success: true, username: body.username }));
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = getCookie(req, 'session');
      if (token) sessions.delete(token);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0'
      });
      return res.end(JSON.stringify({ success: true }));
    }

    if (pathname === '/api/auth/check' && req.method === 'GET') {
      return send(res, 200, { authenticated: isAuthenticated(req) });
    }

    if (pathname === '/api/admin/packs' && req.method === 'GET') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const data = readPacks();
      data.packs.sort((a, b) => a.sortOrder - b.sortOrder);
      return send(res, 200, data);
    }

    if (pathname === '/api/admin/packs' && req.method === 'POST') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const body = await parseBody(req);
      const data = readPacks();
      const id = 'pack-' + Date.now();
      const pack = sanitizePack(body, {
        id, name: 'Nouveau Pack', subtitle: '', description: '', image: '',
        price: '0 DH', topBadge: 'NEW', cadeauTag: '🎁 Cadeau', giftPosition: 'pos-tl',
        promotion: { active: false, text: '', badgeColor: '#2d6a4f' },
        detailId: null, enabled: true, sortOrder: data.packs.length + 1
      });
      pack.id = id;
      data.packs.push(pack);
      savePacks(data);
      return send(res, 201, pack);
    }

    if (pathname.startsWith('/api/admin/packs/') && req.method === 'PUT') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const data = readPacks();
      const idx = data.packs.findIndex(p => p.id === id);
      if (idx === -1) return send(res, 404, { error: 'Pack introuvable' });
      data.packs[idx] = sanitizePack(body, data.packs[idx]);
      data.packs[idx].id = id;
      savePacks(data);
      return send(res, 200, data.packs[idx]);
    }

    if (pathname.startsWith('/api/admin/packs/') && req.method === 'DELETE') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const id = pathname.split('/').pop();
      const data = readPacks();
      const idx = data.packs.findIndex(p => p.id === id);
      if (idx === -1) return send(res, 404, { error: 'Pack introuvable' });
      data.packs.splice(idx, 1);
      savePacks(data);
      return send(res, 200, { success: true });
    }

    if (pathname === '/api/admin/config' && req.method === 'GET') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const pub = readPublicConfig();
      const adm = readAdminConfig();
      return send(res, 200, { whatsapp: pub.whatsapp, adminUsername: adm.adminUsername });
    }

    if (pathname === '/api/admin/config' && req.method === 'PUT') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const body = await parseBody(req);
      const pub = readPublicConfig();
      const adm = readAdminConfig();
      if (body.whatsapp !== undefined) {
        pub.whatsapp = String(body.whatsapp).replace(/\D/g, '');
        savePublicConfig(pub);
      }
      if (body.adminUsername !== undefined) adm.adminUsername = String(body.adminUsername).trim();
      if (body.newPassword && String(body.newPassword).length >= 6) {
        adm.adminPasswordHash = hashPassword(String(body.newPassword));
      }
      saveAdminConfig(adm);
      return send(res, 200, { success: true, whatsapp: pub.whatsapp, adminUsername: adm.adminUsername });
    }

    if (pathname === '/api/admin/export' && req.method === 'GET') {
      if (!isAuthenticated(req)) return send(res, 401, { error: 'Non autorisé' });
      const packs = readPacks();
      const pub = readPublicConfig();
      return send(res, 200, {
        packs: packs,
        config: { whatsapp: pub.whatsapp }
      });
    }

    /* ── Fichiers statiques ── */
    const normalized = pathname.replace(/\\/g, '/');
    if (BLOCKED_STATIC.has(normalized) || normalized.endsWith('/admin.json')) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic(req, res, filePath);
    }
    if (pathname === '/') {
      return serveStatic(req, res, path.join(ROOT, 'index.html'));
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

migrateLegacyConfig();

server.listen(PORT, () => {
  console.log('');
  console.log('  Mode LOCAL — Node.js pour l\'administration uniquement');
  console.log('  Site public: http://localhost:' + PORT);
  console.log('  Admin:       http://localhost:' + PORT + '/admin.html');
  console.log('  Login:       admin / admin123');
  console.log('');
  console.log('  Publication GitHub Pages: copiez data/packs.json + data/config.json');
  console.log('  (pas besoin de Node.js en production)');
  console.log('');
});
