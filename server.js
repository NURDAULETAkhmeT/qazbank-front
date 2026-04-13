const express = require('express');
const path    = require('path');
const multer  = require('multer');
const fetch   = require('node-fetch');

const app = express();

/* ── Multer (файлы для регистрации) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','application/pdf'];
    if (!ok.includes(file.mimetype)) {
      const e = new Error('INVALID_FILE_TYPE'); e.code = 'INVALID_FILE_TYPE';
      return cb(e);
    }
    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname)));
app.use(express.json());

const BACKEND = 'https://qazbank-backend-production.up.railway.app/api';

/* ── Универсальный прокси JSON ── */
async function proxyJson(req, res, backendPath, method) {
  method = method || 'POST';
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(BACKEND + backendPath, {
      method, headers,
      body: method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { message: text }; }
    res.status(response.status).json(json);
  } catch (err) {
    console.error('Proxy [' + backendPath + ']:', err.message);
    res.status(502).json({ message: 'Бэкенд недоступен. Проверьте интернет-соединение.', error: err.message });
  }
}

/* ── Health ── */
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

/* ── OTP: SMS просто "проходит" (bypass) ─────────────────────────────
   Сервер сохраняет код в памяти и принимает любой 6-значный код.
   Когда бэкенд заработает — убрать этот блок и включить proxyJson.
────────────────────────────────────────────────────────────────────── */
const otpStore = {}; // phone → code

app.post('/api/otp/send', (req, res) => {
  const phone = (req.body && req.body.phone) || '';
  if (!phone) return res.status(400).json({ message: 'Укажите телефон' });
  // Генерируем код (в реальном режиме SMS отправляет бэкенд)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore[phone] = code;
  console.log('[OTP] Phone:', phone, '→ Code:', code); // видно в консоли сервера
  res.json({ sent: true, message: 'SMS отправлено (DEV: см. консоль сервера)', _devCode: code });
});

app.post('/api/otp/verify', (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ verified: false, message: 'Укажите телефон и код' });
  const stored = otpStore[phone];
  // В dev-режиме принимаем: правильный код ИЛИ код "000000"
  if (stored === code || code === '000000') {
    delete otpStore[phone];
    return res.json({ verified: true });
  }
  res.status(400).json({ verified: false, message: 'Неверный код. Попробуйте ещё раз.' });
});

/* ── Регистрация (multipart) ── */
app.post('/api/register', upload.fields([
  { name: 'id_front', maxCount: 1 },
  { name: 'id_back',  maxCount: 1 },
  { name: 'appointment_order', maxCount: 1 }
]), async (req, res) => {
  try {
    const FormData = require('form-data');
    const form = new FormData();
    const fields = ['email','password','firstName','lastName','patronymic','phone','iin','position','bin'];
    for (const f of fields) { if (req.body[f]) form.append(f, req.body[f]); }
    const files = req.files || {};
    for (const [name, arr] of Object.entries(files)) {
      const f = arr[0];
      form.append(name, f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
    const headers = Object.assign({}, form.getHeaders());
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(BACKEND + '/register', { method: 'POST', body: form, headers });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { message: text }; }
    res.status(response.status).json(json);
  } catch (err) {
    console.error('Register proxy error:', err);
    res.status(502).json({ message: 'Бэкенд недоступен.', error: err.message });
  }
});

/* ── Логин ── */
app.post('/api/login', (req, res) => proxyJson(req, res, '/login'));

/* ── Сотрудники ── */
app.get('/api/employees/:companyId', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(BACKEND + '/employees/' + req.params.companyId, { headers });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { message: text }; }
    res.status(response.status).json(json);
  } catch(err) { res.status(502).json({ message: 'Бэкенд недоступен.', error: err.message }); }
});
app.post('/api/employees/approve', (req, res) => proxyJson(req, res, '/employees/approve'));
app.post('/api/employees/reject',  (req, res) => proxyJson(req, res, '/employees/reject'));

/* ── Документы ── */
app.get('/api/documents/:userId', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(BACKEND + '/documents/' + req.params.userId, { headers });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { message: text }; }
    res.status(response.status).json(json);
  } catch(err) { res.status(502).json({ message: 'Бэкенд недоступен.', error: err.message }); }
});

/* ── Уведомления ── */
app.get('/api/notifications', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(BACKEND + '/notifications', { headers });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch(e) { json = { message: text }; }
    res.status(response.status).json(json);
  } catch(err) { res.status(502).json({ message: 'Бэкенд недоступен.', error: err.message }); }
});
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const r = await fetch(BACKEND + '/notifications/read-all', { method: 'PATCH', headers });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch(e) { j = { message: t }; }
    res.status(r.status).json(j);
  } catch(err) { res.status(502).json({ message: 'Бэкенд недоступен.' }); }
});
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const headers = {};
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const r = await fetch(BACKEND + '/notifications/' + req.params.id + '/read', { method: 'PATCH', headers });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch(e) { j = { message: t }; }
    res.status(r.status).json(j);
  } catch(err) { res.status(502).json({ message: 'Бэкенд недоступен.' }); }
});

/* ── Ошибки multer ── */
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ message: 'Размер файла не должен превышать 10MB' });
  if (err && err.code === 'INVALID_FILE_TYPE')
    return res.status(400).json({ message: 'Допустимые форматы: JPG, PNG, PDF' });
  next(err);
});

/* ── SPA fallback ── */
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('✅ Сервер запущен: http://localhost:' + PORT));
