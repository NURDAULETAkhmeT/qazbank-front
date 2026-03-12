/* ============================================================
   QazCorpBank — Application JavaScript
============================================================ */

/* ---------- Modal helpers ---------- */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');

  // При возврате к шагу 1 регистрации ставим фокус на первое пустое поле
  if (id === 'modal-reg-step1' && typeof focusFirstEmptyRegField === 'function') {
    focusFirstEmptyRegField();
  }
}

function focusFirstEmptyRegField() {
  const fields = [
    'reg-iin',
    'reg-lastname',
    'reg-firstname',
    'reg-middlename',
    'reg-phone',
    'reg-email',
    'reg-password',
    'reg-position'
  ];
  for (const id of fields) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.tagName === 'SELECT') {
      if (!el.value) { el.scrollIntoView({behavior:'smooth', block:'center'}); el.focus(); return; }
    } else {
      if (!el.value.trim()) { el.scrollIntoView({behavior:'smooth', block:'center'}); el.focus(); return; }
    }
  }
  // Если всё заполнено - фокус на пароль
  const pass = document.getElementById('reg-password');
  if (pass) pass.focus();
}

function startRegistration() {
  if (typeof resetRegistrationForm === 'function') resetRegistrationForm();
  openModal('modal-reg-step1');
}

function startLogin() {
  if (typeof resetLoginForm === 'function') resetLoginForm();
  openModal('modal-login');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* Close modal when clicking outside */
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('overlay')) {
    e.target.classList.remove('open');
  }

  // Закрытие мобильного меню при клике вне
  const nav = document.querySelector('.main-nav.open');
  const toggle = document.querySelector('.nav-toggle');
  if (nav && !nav.contains(e.target) && toggle && !toggle.contains(e.target)) {
    nav.classList.remove('open');
  }
});

/* Close on Escape */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(m => m.classList.remove('open'));
  }
});

/* ---------- Toast notifications ---------- */
function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
    '<div class="toast-body">' +
      '<div class="toast-title">' + title + '</div>' +
      (message ? '<div class="toast-msg">' + message + '</div>' : '') +
    '</div>' +
    '<button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1rem;color:#6b7b8f;">✕</button>';
  container.appendChild(toast);
  setTimeout(function () { if (toast.parentElement) toast.remove(); }, 4500);
}

/* ---------- Screen navigation ---------- */
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

/* ---------- Sidebar panes ---------- */
function showPane(paneId) {
  document.querySelectorAll('[class*="pane"]').forEach(function (p) { p.classList.remove('active'); });
  var pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(function (i) { i.classList.remove('active'); });
  var activeItem = document.querySelector('[onclick*="' + paneId + '"]');
  if (activeItem) activeItem.classList.add('active');
}

/* ---------- Tabs ---------- */
function setTab(group, value) {
  document.querySelectorAll('[data-tab-group="' + group + '"]').forEach(function (el) {
    el.classList.toggle('active', el.dataset.tabValue === value);
  });
  document.querySelectorAll('[data-tab-content="' + group + '"]').forEach(function (el) {
    el.style.display = el.dataset.tabValue === value ? '' : 'none';
  });
}

/* ---------- Auth: Login ---------- */
function resetLoginForm() {
  const iin = document.getElementById('login-iin');
  const pass = document.getElementById('login-pass');
  const err = document.getElementById('login-error');
  if (iin) iin.value = '';
  if (pass) pass.value = '';
  if (err) err.style.display = 'none';
}

function toggleNav() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;
  nav.classList.toggle('open');
}

async function doLogin() {
  const iinEl = document.getElementById('login-iin');
  const passEl = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');
  const btn = document.querySelector('#modal-login .btn-primary');
  const iinVal = iinEl ? iinEl.value.trim() : '';
  const passVal = passEl ? passEl.value.trim() : '';

  if (iinVal.length !== 12 || passVal.length < 1) {
    if (errEl) errEl.style.display = '';
    showToast('error', 'Ошибка входа', 'Введите ИИН (12 цифр) и пароль.');
    return;
  }

  if (errEl) errEl.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Входим...'; }

  try {
    const response = await apiFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iin: iinVal, password: passVal })
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 200) {
      // Успешная авторизация
      if (payload.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      }
      setCurrentUser(payload.user || null);
      closeModal('modal-login');
      resetLoginForm();
      goTo('screen-dashboard');
      showToast('success', 'Добро пожаловать!', 'Вы успешно вошли в систему.');
      return;
    }

    // Ошибки входа
    if (response.status === 401) {
      if (errEl) errEl.style.display = '';
      showToast('error', 'Ошибка входа', 'Неверный ИИН или пароль.');
      return;
    }
    if (response.status === 403) {
      if (errEl) errEl.style.display = '';
      showToast('error', 'Доступ запрещён', 'Заявка не одобрена или отклонена.');
      return;
    }

    const serverMsg = payload.message || payload.error || payload.detail || '';
    if (errEl) errEl.style.display = '';
    showToast('error', 'Ошибка входа', serverMsg || 'Не удалось выполнить вход. Попробуйте позже.');
  } catch (error) {
    if (errEl) errEl.style.display = '';
    showToast('error', 'Ошибка входа', 'Сервер недоступен или сеть не работает.');
    console.error('Login error:', error);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔐 Войти'; }
  }
}

function doLogout() {
  clearCurrentUser();
  goTo('screen-landing');
  showToast('info', 'Выход выполнен', 'До свидания!');
}

/* ---------- API ---------- */

// Базовый URL реального API (по требованию login должен идти именно сюда)
// При необходимости можно сменить на '/api' для прокси локального сервера.
const API_BASE = 'https://qazbank-backend-production.up.railway.app/api';
const API_REGISTER = API_BASE + '/register';
const API_LOGIN = API_BASE + '/login';

// Ключ в localStorage для JWT токена
const AUTH_TOKEN_KEY = 'qazcorp_auth_token';
const AUTH_USER_KEY  = 'qazcorp_user';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

function getInitials(firstName, lastName) {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (!f && !l) return '??';
  if (!l) return f[0].toUpperCase();
  return (f[0] + l[0]).toUpperCase();
}

const ROLE_CONFIG = {
  director: {
    label: 'Директор',
    badge: 'badge-director',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-analytics','pane-employees','pane-company','pane-audit','pane-settings'],
    perms: ['Просмотр баланса', 'Создание и подтверждение платежей', 'Управление сотрудниками', 'Настройка ролей и прав']
  },
  manager: {
    label: 'Руководитель',
    badge: 'badge-manager',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-analytics','pane-employees','pane-settings'],
    perms: ['Просмотр баланса', 'Создание платежей', 'Просмотр отчётов']
  },
  accountant: {
    label: 'Бухгалтер',
    badge: 'badge-accountant',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-settings'],
    perms: ['Просмотр баланса', 'Работа с выписками', 'Оформление платежей']
  },
  'financial_director': {
    label: 'Фин. директор',
    badge: 'badge-findirector',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-analytics','pane-settings'],
    perms: ['Просмотр баланса', 'Финансовая аналитика', 'Контроль платежей']
  },
  'finance_manager': {
    label: 'Фин. менеджер',
    badge: 'badge-finmanager',
    nav: ['pane-dashboard','pane-analytics','pane-settings'],
    perms: ['Просмотр аналитики', 'Подготовка отчётов']
  }
};

function findRoleConfig(role) {
  if (!role) return null;
  const key = role.toString().toLowerCase().replace(/\s+/g, '_');
  return ROLE_CONFIG[key] || null;
}

function makeNavItem(id, label, icon) {
  return `<a class="sidebar-item sb-item" onclick="showPane('${id}')"><span class="sb-item-ico">${icon}</span><span>${label}</span></a>`;
}

function renderNavForRole(role) {
  const nav = document.getElementById('sb-nav');
  if (!nav) return;
  const cfg = findRoleConfig(role);
  const items = (cfg && cfg.nav) ? cfg.nav : ['pane-dashboard','pane-settings'];
  const labels = {
    'pane-dashboard': ['Главная','🏠'],
    'pane-transfer': ['Платежи','💸'],
    'pane-statements': ['Выписки','📄'],
    'pane-analytics': ['Аналитика','📊'],
    'pane-employees': ['Сотрудники','👥'],
    'pane-company': ['Компания','🏢'],
    'pane-audit': ['Аудит','🧾'],
    'pane-settings': ['Настройки','⚙️'],
    'pane-profile': ['Профиль','👤'],
    'pane-notifications': ['Уведомления','🔔']
  };

  nav.innerHTML = items.map(id => {
    const [label, icon] = labels[id] || ['?', ''];
    return makeNavItem(id, label, icon);
  }).join('');
}

function highlightRoleColumn(role) {
  const cfg = findRoleConfig(role);
  if (!cfg) return;
  const table = document.querySelector('.roles-table-wrap table');
  if (!table) return;

  const headerRow = table.querySelector('thead tr');
  if (!headerRow) return;
  const headers = Array.from(headerRow.children);
  const roleText = cfg.label;

  // remove existing highlights
  table.querySelectorAll('.role-highlight').forEach(el => el.classList.remove('role-highlight'));

  const colIndex = headers.findIndex(th => th.textContent.trim().startsWith(roleText));
  if (colIndex < 0) return;

  headers[colIndex].classList.add('role-highlight');
  table.querySelectorAll('tbody tr').forEach(row => {
    const cell = row.children[colIndex];
    if (cell) cell.classList.add('role-highlight');
  });
}

function renderUser(user) {
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const initials = user ? getInitials(user.firstName, user.lastName) : '';
  const roleCfg = user ? findRoleConfig(user.role) : null;

  const companyName = user?.company?.name || 'Организация';
  const position = user?.position || (roleCfg ? roleCfg.label : '');
  const roleLabel = user?.role ? (roleCfg ? roleCfg.label : user.role) : '';

  // Sidebar
  const sbCompany = document.getElementById('sb-company-name');
  const sbUname = document.getElementById('sb-uname');
  const sbUrole = document.getElementById('sb-urole');
  const sbAvatar = document.getElementById('sb-avatar');

  if (sbCompany) sbCompany.textContent = companyName;
  if (sbUname) sbUname.textContent = fullName || 'Гость';
  if (sbUrole) sbUrole.textContent = position || roleLabel || 'Роль';
  if (sbAvatar) sbAvatar.textContent = initials;

  // Settings page
  const settingsName = document.getElementById('settings-name');
  const settingsRole = document.getElementById('settings-role-badge');
  const settingsFull = document.getElementById('settings-fullname');
  const settingsIin = document.getElementById('settings-iin');
  const settingsPhone = document.getElementById('settings-phone');
  const settingsEmail = document.getElementById('settings-email');
  const settingsPosition = document.getElementById('settings-position');
  const settingsAvatar = document.getElementById('settings-avatar');

  if (settingsName) settingsName.textContent = fullName || '—';
  if (settingsFull) settingsFull.value = fullName || '';
  if (settingsIin) settingsIin.value = user?.iin || '';
  if (settingsPhone) settingsPhone.value = user?.phone || '';
  if (settingsEmail) settingsEmail.value = user?.email || '';
  if (settingsPosition) settingsPosition.value = position;
  if (settingsAvatar) settingsAvatar.textContent = initials;

  if (settingsRole) {
    settingsRole.textContent = roleLabel || 'Роль';
    settingsRole.className = 'badge ' + (roleCfg?.badge || 'badge-viewer');
  }

  // Profile pane
  const profileName = document.getElementById('profile-name-lg');
  const profileRole = document.getElementById('profile-role-lg');
  const profileBadge = document.getElementById('profile-badge-lg');
  const profileAvatar = document.getElementById('profile-avatar-lg');
  const profilePerms = document.getElementById('profile-permissions');

  if (profileName) profileName.textContent = fullName || '—';
  if (profileRole) profileRole.textContent = position || roleLabel || '—';
  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileBadge) {
    profileBadge.innerHTML = roleCfg ? `<span class="badge ${roleCfg.badge}">${roleCfg.label}</span>` : '';
  }
  if (profilePerms) {
    if (roleCfg && roleCfg.perms && roleCfg.perms.length) {
      profilePerms.innerHTML = '<div style="font-weight:700;margin-bottom:0.35rem;">Права по роли:</div>' +
        '<ul style="margin:0;padding-left:1.25rem;line-height:1.5;">' +
        roleCfg.perms.map(p => `<li>${p}</li>`).join('') +
        '</ul>';
    } else {
      profilePerms.innerHTML = '';
    }
  }

  // Dashboard welcome message
  const dashWelcome = document.getElementById('dash-welcome-msg');
  if (dashWelcome) {
    if (user && user.firstName) {
      dashWelcome.textContent = `Добро пожаловать, ${user.firstName}!`; 
    } else {
      dashWelcome.textContent = 'Добро пожаловать!';
    }
  }

  // Navigation menu & permissions table
  renderNavForRole(user?.role);
  highlightRoleColumn(user?.role);
}

async function setCurrentUser(user) {
  if (!user) {
    setStoredUser(null);
    renderUser(null);
    return;
  }
  setStoredUser(user);
  renderUser(user);
}

function clearCurrentUser() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  setCurrentUser(null);
}

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : (path.startsWith('/') ? API_BASE + path : API_BASE + '/' + path);
  const headers = Object.assign({}, getAuthHeaders(), options.headers || {});
  return fetch(url, Object.assign({}, options, { headers }));
}

/* ---------- Auth: Registration ---------- */


let registrationData = {};

/* Валидация шага 1 */
function submitRegistration() {
  const iin      = document.querySelector('#reg-iin').value.trim();
  const lastName = document.querySelector('#reg-lastname').value.trim();
  const firstName= document.querySelector('#reg-firstname').value.trim();
  const phone    = document.querySelector('#reg-phone').value.trim();
  const position = document.querySelector('#reg-position').value.trim();
  const bin      = document.querySelector('#reg-bin').value.trim();
  const email    = document.querySelector('#reg-email').value.trim();
  const password = document.querySelector('#reg-password').value.trim();
  const patronymic = document.querySelector('#reg-middlename').value.trim();

  // Валидация
  if (!/^\d{12}$/.test(iin)) {
    showToast('error', 'Ошибка', 'ИИН должен содержать ровно 12 цифр.'); return;
  }
  if (!/^\d{12}$/.test(bin)) {
    showToast('error', 'Ошибка', 'БИН должен содержать ровно 12 цифр.'); return;
  }
  if (!/^\+7\d{10}$/.test(phone)) {
    showToast('error', 'Ошибка', 'Телефон в формате +7XXXXXXXXXX (11 цифр после +7).'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('error', 'Ошибка', 'Введите корректный email.'); return;
  }
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    showToast('error', 'Ошибка', 'Пароль: минимум 8 символов, заглавная буква и цифра.'); return;
  }
  if (!lastName || !firstName || !position) {
    showToast('error', 'Ошибка', 'Заполните все обязательные поля.'); return;
  }

  // Сохраняем данные
  registrationData = { iin, lastName, firstName, patronymic, phone, position, bin, email, password };

  // Обновляем итоговый экран (шаг 4)
  const fioEl = document.getElementById('summary-fio');
  const iinEl = document.getElementById('summary-iin');
  const phoneEl = document.getElementById('summary-phone');
  const posEl = document.getElementById('summary-position');
  if (fioEl) fioEl.textContent = [lastName, firstName, patronymic].filter(Boolean).join(' ');
  if (iinEl) iinEl.textContent = iin;
  if (phoneEl) phoneEl.textContent = phone;
  if (posEl) posEl.textContent = position;

  closeModal('modal-reg-step1');
  openModal('modal-reg-step2');
}

function resetRegistrationForm() {
  // Поля ввода
  const modal1 = document.getElementById('modal-reg-step1');
  if (modal1) {
    modal1.querySelectorAll('input, select').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  }

  // OTP
  document.querySelectorAll('#modal-reg-step2 .otp-input').forEach(i => i.value = '');

  // Файлы
  ['file-id-front', 'file-id-back', 'file-order'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  // Метки загрузки
  const defaultLabels = {
    'label-id-front': 'Нажмите или перетащите · JPG, PNG, PDF до 10MB',
    'label-id-back': 'Нажмите или перетащите · JPG, PNG, PDF до 10MB',
    'label-order': 'По усмотрению (рекомендуется) · JPG, PNG, PDF до 10MB'
  };
  Object.entries(defaultLabels).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  // Дроп-зоны
  ['drop-id-front', 'drop-id-back', 'drop-order'].forEach(id => {
    const zone = document.getElementById(id);
    if (zone) zone.style.borderColor = 'var(--light)';
  });

  // Резюме
  ['summary-fio', 'summary-iin', 'summary-phone', 'summary-position', 'summary-docs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  // Согласие
  const agree = document.getElementById('reg-agree');
  if (agree) agree.checked = false;
}

/* Инициализация drag-and-drop и file input для загрузки документов */
function initFileUpload(dropZoneId, inputId, labelId) {
  const zone  = document.getElementById(dropZoneId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--navy)';
    zone.style.background  = 'rgba(10,28,64,0.04)';
  });
  zone.addEventListener('dragleave', () => {
    zone.style.borderColor = 'var(--light)';
    zone.style.background  = '';
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = 'var(--light)';
    zone.style.background  = '';
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      updateFileLabel(input, label, zone);
    }
  });

  input.addEventListener('change', () => updateFileLabel(input, label, zone));
}

function updateFileLabel(input, label, zone) {
  if (input.files && input.files[0]) {
    const name = input.files[0].name;
    if (label) label.textContent = '✅ ' + name;
    zone.style.borderColor = 'var(--green)';
    // Обновляем статус документов на шаге 4
    const docStatus = document.getElementById('summary-docs');
    if (docStatus) docStatus.textContent = '✓ Загружены';
  }
}

/* Отправка финальной заявки с FormData */
async function finishReg() {
  const idFront = document.getElementById('file-id-front');
  const idBack  = document.getElementById('file-id-back');
  const order   = document.getElementById('file-order');
  const agreed  = document.getElementById('reg-agree');

  if (!agreed || !agreed.checked) {
    showToast('warning', 'Подтвердите согласие', 'Примите условия обслуживания.'); return;
  }
  if (!idFront || !idFront.files[0]) {
    showToast('error', 'Документы', 'Загрузите лицевую сторону удостоверения.'); return;
  }
  if (!idBack || !idBack.files[0]) {
    showToast('error', 'Документы', 'Загрузите обратную сторону удостоверения.'); return;
  }

  // Собираем FormData
  const form = new FormData();
  form.append('email',      registrationData.email);
  form.append('password',   registrationData.password);
  form.append('firstName',  registrationData.firstName);
  form.append('lastName',   registrationData.lastName);
  form.append('phone',      registrationData.phone);
  form.append('iin',        registrationData.iin);
  form.append('position',   registrationData.position);
  form.append('bin',        registrationData.bin);
  form.append('id_front',   idFront.files[0]);
  form.append('id_back',    idBack.files[0]);
  if (registrationData.patronymic) {
    form.append('patronymic', registrationData.patronymic);
  }
  if (order && order.files[0]) {
    form.append('appointment_order', order.files[0]);
  }

  // UI: блокируем кнопку
  const btn = document.getElementById('btn-submit-reg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Отправка...'; }

  try {
    const response = await apiFetch('/register', {
      method: 'POST',
      body: form,
      // НЕ указываем Content-Type — браузер сам добавит boundary для multipart/form-data
    });

    const payload = await response.json().catch(() => ({}));

    function getServerMsg() {
      if (payload.message) return payload.message;
      if (payload.error) return payload.error;
      if (payload.detail) return payload.detail;
      if (payload.errors) {
        if (typeof payload.errors === 'string') return payload.errors;
        if (Array.isArray(payload.errors) && payload.errors.length) return payload.errors.join('; ');
        if (typeof payload.errors === 'object') return Object.values(payload.errors).flat().join('; ');
      }
      return '';
    }

    function getDuplicateField() {
      if (payload.field) return payload.field;
      if (payload.duplicate) return payload.duplicate;
      if (payload.errors && typeof payload.errors === 'object') {
        const fields = Object.keys(payload.errors).filter(k => payload.errors[k] && payload.errors[k].length);
        return fields.length ? fields[0] : null;
      }
      return null;
    }

    const serverMsg = getServerMsg();
    const dupField = getDuplicateField();

    if (response.status === 201 || response.status === 200 || response.status === 202) {
      closeModal('modal-reg-step4');
      openModal('modal-login');
      showToast('success', 'Заявка отправлена', serverMsg || 'Заявка отправлена на проверку. Войдите позже после подтверждения.');
      resetRegistrationForm();
      registrationData = {};
    } else if (response.status === 400) {
      showToast('error', 'Ошибка валидации', serverMsg || 'Проверьте правильность данных.');
    } else if (response.status === 404) {
      showToast('error', 'БИН не найден', serverMsg || 'Компания с таким БИН не зарегистрирована в банке.');
    } else if (response.status === 409) {
      const dupMsg = dupField ? `Данные уже существуют: ${dupField}` : (serverMsg || 'Сотрудник с таким ИИН уже существует в системе.');
      showToast('error', 'Дубликат', dupMsg);
    } else {
      showToast('error', 'Ошибка отправки', serverMsg || 'Не удалось отправить заявку. Попробуйте позже.');
    }
  } catch (error) {
    console.error('Тип ошибки:', error.name);
    console.error('Сообщение:', error.message);
    console.error('Полная ошибка:', error);

    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      showToast('error', 'Ошибка отправки', 'Сервер недоступен или заблокирован CORS.');
    } else {
      showToast('error', 'Ошибка отправки', error.message || 'Не удалось отправить заявку.');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✓ Отправить заявку в банк'; }
  }
}

/* ---------- Payments ---------- */
function submitPayment() {
  closeModal('modal-new-payment');
  showToast('success', 'Платёж отправлен', 'Платёж поставлен в очередь на обработку.');
}

/* ---------- Permissions ---------- */
function checkPerm(checkbox, label) {
  var state = checkbox.checked ? 'включено' : 'отключено';
  showToast('info', 'Право обновлено', '"' + label + '" — ' + state);
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', function () {
  const storedUser = getStoredUser();
  if (storedUser && getAuthToken()) {
    setCurrentUser(storedUser);
    goTo('screen-dashboard');
  } else {
    if (!document.querySelector('.screen.active')) {
      var landing = document.getElementById('screen-landing');
      if (landing) landing.classList.add('active');
    }
  }

  // Инициализация drag-and-drop зон загрузки документов
  initFileUpload('drop-id-front', 'file-id-front', 'label-id-front');
  initFileUpload('drop-id-back',  'file-id-back',  'label-id-back');
  initFileUpload('drop-order',    'file-order',    'label-order');

  // Скрывать мобильное навигационное меню, когда пользователь выбирает пункт
  document.querySelectorAll('.main-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      const nav = document.querySelector('.main-nav.open');
      if (nav) nav.classList.remove('open');
    });
  });
});