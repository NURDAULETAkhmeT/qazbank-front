const express = require('express');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch'); // npm install node-fetch@2

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      const err = new Error('INVALID_FILE_TYPE');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname)));

// Парсинг JSON для входа
app.use(express.json());

app.post('/api/register', upload.fields([
  { name: 'id_front', maxCount: 1 },
  { name: 'id_back', maxCount: 1 },
  { name: 'appointment_order', maxCount: 1 }
]), async (req, res) => {
  try {
    const FormData = require('form-data');
    const form = new FormData();

    // Пересылаем текстовые поля
    const fields = ['email','password','firstName','lastName','patronymic','phone','iin','position','bin'];
    for (const field of fields) {
      if (req.body[field]) form.append(field, req.body[field]);
    }

    // Пересылаем файлы
    const files = req.files || {};
    for (const [fieldName, fileArr] of Object.entries(files)) {
      const f = fileArr[0];
      form.append(fieldName, f.buffer, {
        filename: f.originalname,
        contentType: f.mimetype
      });
    }

    // Отправляем на реальный бэкенд (сервер→сервер, без CORS)
    const headers = Object.assign({}, form.getHeaders());
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const response = await fetch('https://qazbank-backend-production.up.railway.app/api/register', {
      method: 'POST',
      body: form,
      headers
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { message: text }; }

    res.status(response.status).json(json);

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ message: 'Ошибка прокси-сервера', error: err.message });
  }
});

// Вход (логин) — пересылаем на реальный бэкенд
app.post('/api/login', async (req, res) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const response = await fetch('https://qazbank-backend-production.up.railway.app/api/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ iin: req.body.iin, password: req.body.password })
    });

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { message: text }; }

    res.status(response.status).json(json);
  } catch (err) {
    console.error('Proxy login error:', err);
    res.status(502).json({ message: 'Ошибка прокси-сервера', error: err.message });
  }
});

// Ошибки multer
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ message: 'Размер файла не должен превышать 10MB' });
  if (err && err.code === 'INVALID_FILE_TYPE')
    return res.status(400).json({ message: 'Допустимые форматы: JPG, PNG, PDF' });
  next(err);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
