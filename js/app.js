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

  if (paneId === 'pane-employees') loadEmployees();
  if (paneId === 'pane-notifications') loadNotifications();
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
      if (payload.token) {
        sessionStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      }
      // Normalize user: API returns camelCase but handle snake_case fallback
      const u = payload.user || {};
      const normalizedUser = {
        id:        u.id,
        email:     u.email     || '',
        firstName: u.firstName || u.first_name  || '',
        lastName:  u.lastName  || u.last_name   || '',
        role:      u.role      || '',
        position:  u.position  || '',
        status:    u.status    || 'active',
        iin:       u.iin       || '',
        phone:     u.phone     || '',
        company:   u.company   || {},
        companyId: u.companyId || (u.company && u.company.id) || ''
      };
      setCurrentUser(normalizedUser);
      closeModal('modal-login');
      resetLoginForm();
      goTo('screen-dashboard');
      logAuditEvent({
        userName: normalizedUser.firstName + ' ' + normalizedUser.lastName,
        userRole: normalizedUser.role,
        action: 'Вход в систему',
        object: '—',
        result: '✓ Успех'
      });
      showToast('success', 'Добро пожаловать!', 'Вы успешно вошли в систему.');
      return;
    }

    // Ошибки входа
    if (response.status === 401) {
      if (errEl) errEl.style.display = '';
      logAuditEvent({
        userName: iinVal,
        action: 'Неудачный вход',
        object: '—',
        result: '✗ Ошибка'
      });
      showToast('error', 'Ошибка входа', 'Неверный ИИН или пароль.');
      return;
    }
    if (response.status === 403) {
      if (errEl) errEl.style.display = '';
      logAuditEvent({
        userName: iinVal,
        action: 'Неудачный вход',
        object: '—',
        result: '✗ Доступ запрещён'
      });
      const st = payload.status || '';
      const msg = st === 'rejected'
        ? 'Ваша заявка отклонена директором.'
        : 'Заявка ещё не одобрена. Ожидайте подтверждения директора.';
      showToast('error', 'Доступ запрещён', msg);
      return;
    }

    const serverMsg = payload.message || payload.error || payload.detail || '';
    if (errEl) errEl.style.display = '';
    showToast('error', 'Ошибка входа', serverMsg || 'Не удалось выполнить вход. Попробуйте позже.');
  } catch (error) {
    if (errEl) errEl.style.display = '';
    console.error('Login error:', error);
    let msg = 'Сервер недоступен. Убедитесь что запущен npm start и открыт http://localhost:3001';
    if (window.location.protocol === 'file:') {
      msg = '⚠️ Откройте сайт через сервер: запустите npm start, затем http://localhost:3001';
    }
    showToast('error', 'Ошибка соединения', msg);
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
const API_BASE = '/api'; // Все запросы через локальный прокси server.js
const API_REGISTER = API_BASE + '/register';
const API_LOGIN = API_BASE + '/login';

// Токен хранится только в sessionStorage (очищается при закрытии вкладки)
const AUTH_TOKEN_KEY = 'qazcorp_auth_token';
const AUTH_USER_KEY  = 'qazcorp_user';

function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (!user) {
    sessionStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
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
    label: 'Менеджер',
    badge: 'badge-manager',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-settings'],
    perms: ['Просмотр баланса', 'Создание заявок на перевод', 'Работа с собственными виртуальными счетами']
  },
  accountant: {
    label: 'Бухгалтер',
    badge: 'badge-accountant',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-settings'],
    perms: ['Просмотр баланса', 'Работа с выписками', 'Оформление платежей (на одобрение директора)']
  },
  findirector: {
    label: 'Фин. директор',
    badge: 'badge-findirector',
    nav: ['pane-dashboard','pane-transfer','pane-statements','pane-analytics','pane-settings'],
    perms: ['Просмотр баланса', 'Финансовая аналитика', 'Платежи без лимита', 'Контроль платежей']
  },
  finmanager: {
    label: 'Фин. менеджер',
    badge: 'badge-finmanager',
    nav: ['pane-dashboard','pane-analytics','pane-settings'],
    perms: ['Просмотр аналитики', 'Подготовка отчётов']
  },
  cashier: {
    label: 'Кассир',
    badge: 'badge-viewer',
    nav: ['pane-dashboard','pane-statements','pane-settings'],
    perms: ['Просмотр баланса', 'Просмотр выписок']
  },
  viewer: {
    label: 'Наблюдатель',
    badge: 'badge-viewer',
    nav: ['pane-dashboard','pane-settings'],
    perms: ['Просмотр баланса']
  }
};

const COMPANY_ROOT_ACCOUNT = {
  id: 'main',
  name: 'Основной счёт компании',
  iban: 'KZ89 125K ZT00 0001 2345 67',
  currency: 'KZT',
  balance: 248750000,
  available: 240100000
};

const VIRTUAL_ACCOUNTS = [
  { id:'va-1', name:'Виртуальный счёт закупок', iban:'KZ89 125K ZT00 0001 2345 68', currency:'KZT', balance: 64000000, ownerRole:'manager', ownerLabel:'Менеджер отдела', parentId:'main' },
  { id:'va-2', name:'Виртуальный счёт маркетинга', iban:'KZ89 125K ZT00 0001 2345 69', currency:'KZT', balance: 31000000, ownerRole:'accountant', ownerLabel:'Бухгалтер', parentId:'main' },
  { id:'va-3', name:'Виртуальный счёт операционный', iban:'KZ89 125K ZT00 0001 2345 70', currency:'KZT', balance: 25500000, ownerRole:'director', ownerLabel:'Директор', parentId:'main' }
];

let TRANSACTIONS = [
  {
    id: 'TX-2026-001',
    document: 'ПП-001847',
    createdAt: '2026-03-07T14:32:00',
    type: 'payment',
    description: 'Оплата металлопроката',
    counterparty: 'ТОО «КазМеталл»',
    accountId: 'main',
    virtualId: 'va-1',
    direction: 'out',
    amount: 12450000,
    currency: 'KZT',
    status: 'approved',
    createdBy: 'Мухамедова Динара',
    approvedBy: 'Алиев Серик',
    balanceAfter: 248750000
  },
  {
    id: 'TX-2026-002',
    document: 'ПП-001846',
    createdAt: '2026-03-07T11:15:00',
    type: 'income',
    description: 'Поступление от клиента',
    counterparty: 'АО «Ромат»',
    accountId: 'main',
    direction: 'in',
    amount: 28000000,
    currency: 'KZT',
    status: 'approved',
    createdBy: 'Сейткали Мадияр',
    approvedBy: 'Алиев Серик',
    balanceAfter: 261200000
  },
  {
    id: 'TX-2026-003',
    document: 'ПП-001845',
    createdAt: '2026-03-06T17:45:00',
    type: 'payment',
    description: 'Аренда офиса март',
    counterparty: 'ТОО «Офис-Центр»',
    accountId: 'main',
    direction: 'out',
    amount: 3200000,
    currency: 'KZT',
    status: 'approved',
    createdBy: 'Мухамедова Динара',
    approvedBy: 'Алиев Серик',
    balanceAfter: 233200000
  },
  {
    id: 'TX-2026-004',
    document: 'SW-000124',
    createdAt: '2026-03-06T09:00:00',
    type: 'swift',
    description: 'SWIFT платёж USD',
    counterparty: 'BARCLAYS BANK PLC',
    accountId: 'main',
    direction: 'out',
    amount: 85000,
    currency: 'USD',
    status: 'pending',
    createdBy: 'Мухамедова Динара'
  },
  {
    id: 'TX-2026-005',
    document: 'ЗП-001200',
    createdAt: '2026-03-05T16:20:00',
    type: 'salary',
    description: 'Зарплата сотрудников',
    counterparty: '142 сотрудника',
    accountId: 'main',
    direction: 'out',
    amount: 38500000,
    currency: 'KZT',
    status: 'approved',
    createdBy: 'Мухамедова Динара',
    approvedBy: 'Алиев Серик',
    balanceAfter: 236400000
  }
];

const STATEMENT_FILTERS = {
  account: 'all',
  type: 'all',
  from: '',
  to: ''
};

function getCurrentUser() {
  return getStoredUser();
}

function getAccountById(id) {
  if (id === 'main') return COMPANY_ROOT_ACCOUNT;
  return VIRTUAL_ACCOUNTS.find(function (acct) { return acct.id === id; }) || null;
}

function getAccessibleAccounts(user) {
  const mainPlus = [COMPANY_ROOT_ACCOUNT];
  if (!user) return mainPlus;
  if (user.role === 'director' || user.role === 'findirector' || user.role === 'finmanager') {
    return mainPlus.concat(VIRTUAL_ACCOUNTS);
  }
  if (user.role === 'manager' || user.role === 'accountant') {
    return mainPlus.concat(VIRTUAL_ACCOUNTS.filter(function (acct) {
      return acct.ownerRole === user.role;
    }));
  }
  if (user.role === 'cashier' || user.role === 'viewer') {
    return mainPlus;
  }
  return mainPlus;
}

function formatCurrency(amount, currency) {
  if (currency === 'USD') return '$' + Number(amount).toLocaleString('en-US');
  if (currency === 'EUR') return '€' + Number(amount).toLocaleString('de-DE');
  if (currency === 'KZT') return '₸ ' + Number(amount).toLocaleString('ru-RU');
  return amount + ' ' + currency;
}

function getStatusBadge(status) {
  if (!status) return '<span class="badge badge-pending">Неизвестно</span>';
  const key = status.toLowerCase();
  if (key === 'approved' || key === 'completed') return '<span class="badge badge-active">✓ Выполнен</span>';
  if (key === 'pending') return '<span class="badge badge-pending">⏳ На рассмотрении</span>';
  if (key === 'rejected') return '<span class="badge badge-danger">✕ Отклонён</span>';
  return '<span class="badge">' + status + '</span>';
}

function isAmountNegative(direction) {
  return direction === 'out';
}

function getFilteredTransactions() {
  const account = document.getElementById('statement-account');
  const type = document.getElementById('statement-type');
  const from = document.getElementById('statement-from');
  const to = document.getElementById('statement-to');
  const filterAccount = account ? account.value : STATEMENT_FILTERS.account;
  const filterType = type ? type.value : STATEMENT_FILTERS.type;
  const fromDate = from ? from.value : STATEMENT_FILTERS.from;
  const toDate = to ? to.value : STATEMENT_FILTERS.to;

  return TRANSACTIONS.slice().filter(function (tx) {
    if (filterAccount && filterAccount !== 'all') {
      if (tx.accountId !== filterAccount && tx.virtualId !== filterAccount) return false;
    }
    if (filterType && filterType !== 'all' && tx.type !== filterType) return false;
    if (fromDate) {
      const date = tx.createdAt ? tx.createdAt.slice(0, 10) : '';
      if (date < fromDate) return false;
    }
    if (toDate) {
      const date = tx.createdAt ? tx.createdAt.slice(0, 10) : '';
      if (date > toDate) return false;
    }
    return true;
  }).sort(function (a, b) {
    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  });
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10)
  };
}

function updateStatementDateDefaults() {
  const range = getCurrentMonthRange();
  const from = document.getElementById('statement-from');
  const to = document.getElementById('statement-to');
  if (from && !from.value) from.value = range.from;
  if (to && !to.value) to.value = range.to;
}

function formatAnalyticsAmount(amount, currency) {
  if (amount === null || amount === undefined) return '₸ 0';
  if (currency === 'USD') return '$' + Number(amount).toLocaleString('en-US');
  if (currency === 'EUR') return '€' + Number(amount).toLocaleString('de-DE');
  return '₸ ' + Number(amount).toLocaleString('ru-RU');
}

function getLatestTransactionMonth() {
  return TRANSACTIONS.reduce(function (latest, tx) {
    if (!tx.createdAt) return latest;
    var created = new Date(tx.createdAt);
    if (isNaN(created.getTime())) return latest;
    return !latest || created > latest ? created : latest;
  }, null);
}

function renderAnalytics() {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  var monthlyData = {};
  TRANSACTIONS.forEach(function (tx) {
    if (!tx.createdAt) return;
    if (tx.currency !== 'KZT') return;
    var created = new Date(tx.createdAt);
    if (isNaN(created.getTime())) return;
    var key = created.getFullYear() + '-' + String(created.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[key]) {
      monthlyData[key] = { year: created.getFullYear(), month: created.getMonth(), income: 0, expense: 0, turnover: 0, txs: [] };
    }
    var amount = Number(tx.amount) || 0;
    if (tx.direction === 'in') monthlyData[key].income += amount;
    if (tx.direction === 'out') monthlyData[key].expense += amount;
    monthlyData[key].turnover += amount;
    monthlyData[key].txs.push(tx);
  });

  var monthKeys = Object.keys(monthlyData).sort();
  var latestKey = monthKeys.length ? monthKeys[monthKeys.length - 1] : null;
  var prevKey = monthKeys.length > 1 ? monthKeys[monthKeys.length - 2] : null;
  var latestData = latestKey ? monthlyData[latestKey] : { year: new Date().getFullYear(), month: new Date().getMonth(), income: 0, expense: 0, turnover: 0, txs: [] };
  var prevData = prevKey ? monthlyData[prevKey] : { income: 0, expense: 0, turnover: 0, txs: [] };

  var income = latestData.income;
  var expense = latestData.expense;
  var net = income - expense;
  var turnover = latestData.turnover;

  var incomeLabel = document.getElementById('analytics-income-label');
  var incomeValue = document.getElementById('analytics-income-value');
  var incomeChange = document.getElementById('analytics-income-change');
  var expenseLabel = document.getElementById('analytics-expense-label');
  var expenseValue = document.getElementById('analytics-expense-value');
  var expenseChange = document.getElementById('analytics-expense-change');
  var netLabel = document.getElementById('analytics-net-label');
  var netValue = document.getElementById('analytics-net-value');
  var netChange = document.getElementById('analytics-net-change');
  var turnoverLabel = document.getElementById('analytics-turnover-label');
  var turnoverValue = document.getElementById('analytics-turnover-value');
  var turnoverChange = document.getElementById('analytics-turnover-change');

  var activeMonthLabel = months[latestData.month] + ' ' + latestData.year;
  if (incomeLabel) incomeLabel.textContent = 'Доходы (' + activeMonthLabel + ')';
  if (incomeValue) incomeValue.textContent = formatAnalyticsAmount(income, 'KZT');
  if (incomeChange) {
    var diff = prevData.income ? Math.round(((income - prevData.income) / Math.abs(prevData.income)) * 100) : 0;
    incomeChange.textContent = prevData.income ? '▲ ' + (diff >= 0 ? '+' + diff + '%' : diff + '%') : income ? '● Новое' : '—';
    incomeChange.className = 'stat-change ' + (income >= prevData.income ? 'change-up' : 'change-dn');
  }

  if (expenseLabel) expenseLabel.textContent = 'Расходы (' + activeMonthLabel + ')';
  if (expenseValue) expenseValue.textContent = formatAnalyticsAmount(expense, 'KZT');
  if (expenseChange) {
    var diffExp = prevData.expense ? Math.round(((expense - prevData.expense) / Math.abs(prevData.expense)) * 100) : 0;
    expenseChange.textContent = prevData.expense ? (diffExp >= 0 ? '▲ +' + diffExp + '%' : '▼ ' + Math.abs(diffExp) + '%') : expense ? '● Новое' : '—';
    expenseChange.className = 'stat-change ' + (expense <= prevData.expense ? 'change-up' : 'change-dn');
  }

  if (netLabel) netLabel.textContent = 'Чистый поток (' + activeMonthLabel + ')';
  if (netValue) netValue.textContent = formatAnalyticsAmount(net, 'KZT');
  if (netChange) {
    var prevNet = prevData.income - prevData.expense;
    var diffNet = prevNet ? Math.round(((net - prevNet) / Math.abs(prevNet)) * 100) : 0;
    netChange.textContent = prevNet ? (diffNet >= 0 ? '▲ +' + diffNet + '%' : '▼ ' + Math.abs(diffNet) + '%') : net ? '● Новое' : '—';
    netChange.className = 'stat-change ' + (net >= prevNet ? 'change-up' : 'change-dn');
  }

  if (turnoverLabel) turnoverLabel.textContent = 'Оборот (' + activeMonthLabel + ')';
  if (turnoverValue) turnoverValue.textContent = formatAnalyticsAmount(turnover, 'KZT');
  if (turnoverChange) {
    var diffTurn = prevData.turnover ? Math.round(((turnover - prevData.turnover) / Math.abs(prevData.turnover)) * 100) : 0;
    turnoverChange.textContent = prevData.turnover ? (diffTurn >= 0 ? '▲ +' + diffTurn + '%' : '▼ ' + Math.abs(diffTurn) + '%') : turnover ? '● Новое' : '—';
    turnoverChange.className = 'stat-change ' + (turnover >= prevData.turnover ? 'change-up' : 'change-dn');
  }

  var expenseStructure = document.getElementById('analytics-expense-structure');
  if (expenseStructure) {
    var categories = [
      { key: 'suppliers', label: '💼 Поставщики', total: 0 },
      { key: 'salary', label: '👥 Зарплата', total: 0 },
      { key: 'rent', label: '🏢 Аренда', total: 0 },
      { key: 'taxes', label: '🧾 Налоги', total: 0 },
      { key: 'other', label: '📦 Прочие', total: 0 }
    ];
    latestData.txs.filter(function (tx) { return tx.direction === 'out'; }).forEach(function (tx) {
      var desc = tx.description || '';
      var target = 'other';
      if (tx.type === 'salary' || /зарплат/i.test(desc)) target = 'salary';
      else if (/аренд|коммун|комм|жкх/i.test(desc)) target = 'rent';
      else if (/налог|сбор/i.test(desc)) target = 'taxes';
      else if (tx.type === 'payment' || tx.type === 'swift') target = 'suppliers';
      var category = categories.find(function (item) { return item.key === target; });
      if (category) category.total += tx.amount;
    });
    var totalExpense = categories.reduce(function (sum, item) { return sum + item.total; }, 0);
    if (!totalExpense) {
      expenseStructure.innerHTML = '<div style="text-align:center;color:var(--muted);padding:1rem;">Нет данных о расходах за выбранный период.</div>';
    } else {
      expenseStructure.innerHTML = categories.map(function (item) {
        if (!item.total) return '';
        var percent = Math.round((item.total / totalExpense) * 100);
        var width = percent ? percent : 4;
        return '<div><div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:0.3rem;"><span>' + item.label + '</span><span style="font-weight:700;">' + percent + '%</span></div><div style="height:8px;background:var(--light);border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + width + '%;background:var(--navy);border-radius:4px;"></div></div></div>';
      }).join('');
    }
  }

  var counterpartyList = document.getElementById('analytics-counterparty-list');
  if (counterpartyList) {
    var totals = {};
    latestData.txs.forEach(function (tx) {
      if (!tx.counterparty) return;
      totals[tx.counterparty] = (totals[tx.counterparty] || 0) + tx.amount;
    });
    var topCounterparties = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; }).slice(0, 5);
    if (!topCounterparties.length) {
      counterpartyList.innerHTML = '<div style="text-align:center;color:var(--muted);padding:1rem;">Нет данных.</div>';
    } else {
      counterpartyList.innerHTML = topCounterparties.map(function (name) {
        var value = totals[name];
        return '<div style="padding:0.9rem 1.25rem;border-bottom:1px solid var(--light);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:0.85rem;font-weight:700;">' + name + '</div><div style="font-size:0.72rem;color:var(--muted);">Оборот</div></div><span style="font-weight:700;color:' + (value >= 0 ? 'var(--green)' : 'var(--red)') + ';">' + formatAnalyticsAmount(value, 'KZT') + '</span></div>';
      }).join('');
    }
  }

  var chart = document.getElementById('analytics-turnover-chart');
  if (chart) {
    var chartKeys = monthKeys.slice(-6);
    if (!chartKeys.length) {
      chart.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);">Нет данных для графика.</div>';
    } else {
      var monthTotals = chartKeys.map(function (key) { return Math.abs(monthlyData[key].turnover); });
      var maxValue = Math.max.apply(null, monthTotals) || 1;
      chart.innerHTML = chartKeys.map(function (key, index) {
        var monthInfo = monthlyData[key];
        var height = Math.round((monthTotals[index] / maxValue) * 100);
        var color = index === chartKeys.length - 1 ? 'var(--navy2)' : 'var(--navy)';
        return '<div class="ch-group"><div class="ch-bar" style="height:' + (height || 15) + '%;background:' + color + ';"></div><div class="ch-lbl">' + months[monthInfo.month] + '</div></div>';
      }).join('');
    }
  }
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateDashboardSummary() {
  const mainBalanceEl = document.getElementById('main-acc-balance');
  const mainAvailableEl = document.getElementById('main-acc-available');
  const ibanEl = document.getElementById('main-acc-iban');
  if (mainBalanceEl) mainBalanceEl.textContent = formatCurrency(COMPANY_ROOT_ACCOUNT.balance, COMPANY_ROOT_ACCOUNT.currency);
  if (mainAvailableEl) mainAvailableEl.textContent = COMPANY_ROOT_ACCOUNT.currency + ' · Доступно: ' + formatCurrency(COMPANY_ROOT_ACCOUNT.available, COMPANY_ROOT_ACCOUNT.currency);
  if (ibanEl) ibanEl.textContent = COMPANY_ROOT_ACCOUNT.iban;
}

function renderVirtualAccounts() {
  const list = document.getElementById('virtual-account-list');
  const user = getCurrentUser();
  if (!list) return;
  const accounts = getAccessibleAccounts(user).filter(function (acct) { return acct.id !== 'main'; });
  if (!accounts.length) {
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">У вас нет назначенных виртуальных счетов.</div>';
    return;
  }
  list.innerHTML = accounts.map(function (acct) {
    return '<div style="padding:1rem 1.5rem;border-bottom:1px solid var(--light);display:flex;align-items:center;justify-content:space-between;gap:1rem;">' +
      '<div><div style="font-size:0.85rem;font-weight:700;color:var(--navy);">' + acct.name + '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);">' + acct.iban + '</div></div>' +
      '<div style="text-align:right;"><div style="font-weight:700;color:var(--navy);">' + formatCurrency(acct.balance, acct.currency) + '</div><div style="font-size:0.72rem;color:var(--green);">' + acct.ownerLabel + '</div></div>' +
    '</div>';
  }).join('');
}

function renderPendingPayments() {
  const list = document.getElementById('pending-payment-list');
  const card = document.getElementById('pending-payments-card');
  const count = document.getElementById('pending-count');
  const summary = document.getElementById('dashboard-pending-summary');
  const summaryCount = document.getElementById('dashboard-pending-count');
  const user = getCurrentUser();
  const pending = TRANSACTIONS.filter(function (tx) { return tx.status === 'pending'; });
  if (!list || !card || !count) return;

  if (!user || user.role !== 'director') {
    card.style.display = 'none';
  } else {
    card.style.display = pending.length ? '' : 'none';
  }
  count.textContent = pending.length;
  if (summaryCount) summaryCount.textContent = pending.length;

  const renderItem = function (tx) {
    const account = getAccountById(tx.virtualId || tx.accountId);
    const accountName = account ? account.name : 'Основной счёт';
    const createdBy = tx.createdBy ? 'Отправил: ' + tx.createdBy : '';
    const actionButtons = user && user.role === 'director'
      ? '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;">' +
          '<button class="btn btn-sm btn-primary" onclick="approvePendingPayment(\'' + tx.id + '\')">✓ Подтвердить</button>' +
          '<button class="btn btn-sm btn-danger" onclick="rejectPendingPayment(\'' + tx.id + '\')">✕ Отклонить</button>' +
        '</div>'
      : '';

    return '<div style="padding:0.9rem 1.5rem;border-bottom:1px solid var(--light);display:flex;align-items:center;gap:0.75rem;justify-content:space-between;">' +
      '<div style="flex:1;"><div style="font-size:0.83rem;font-weight:700;">' + tx.description + '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);">' + accountName + ' · ' + formatCurrency(tx.amount, tx.currency) + '</div>' +
      (createdBy ? '<div style="font-size:0.70rem;color:var(--muted);margin-top:0.35rem;">' + createdBy + '</div>' : '') +
      '</div>' +
      actionButtons +
    '</div>';
  };

  if (list) {
    if (!pending.length) {
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Нет заявок на подтверждение.</div>';
    } else {
      list.innerHTML = pending.map(renderItem).join('');
    }
  }

  if (summary) {
    if (!pending.length) {
      summary.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Нет заявок на подтверждение.</div>';
    } else {
      summary.innerHTML = pending.slice(0, 3).map(renderItem).join('');
    }
  }
}

function renderLatestTransactions() {
  const table = document.getElementById('latest-transactions-body');
  if (!table) return;
  const rows = TRANSACTIONS.slice().sort(function (a, b) {
    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  }).slice(0, 5);
  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:1rem;">Нет транзакций.</td></tr>';
    return;
  }
  table.innerHTML = rows.map(function (tx) {
    const created = tx.createdAt ? new Date(tx.createdAt) : null;
    const datetime = created ? created.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    return '<tr>' +
      '<td>' + datetime + '</td>' +
      '<td>' + tx.description + '</td>' +
      '<td>' + tx.counterparty + '</td>' +
      '<td>' + getStatusBadge(tx.status) + '</td>' +
      '<td class="' + (isAmountNegative(tx.direction) ? 'amt-neg' : 'amt-pos') + '">' + (isAmountNegative(tx.direction) ? '−' : '+') + formatCurrency(tx.amount, tx.currency) + '</td>' +
    '</tr>';
  }).join('');
}

function renderTransferHistory() {
  const table = document.getElementById('transfer-history-body');
  if (!table) return;
  const rows = TRANSACTIONS.slice().sort(function (a, b) {
    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  }).slice(0, 3);
  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:1rem;">Нет завершённых переводов.</td></tr>';
    return;
  }
  table.innerHTML = rows.map(function (tx) {
    return '<tr>' +
      '<td>' + tx.counterparty + '</td>' +
      '<td class="' + (isAmountNegative(tx.direction) ? 'amt-neg' : 'amt-pos') + '">' + (isAmountNegative(tx.direction) ? '−' : '+') + formatCurrency(tx.amount, tx.currency) + '</td>' +
      '<td>' + getStatusBadge(tx.status) + '</td>' +
    '</tr>';
  }).join('');
}

function renderStatementTable() {
  const table = document.getElementById('statement-table-body');
  if (!table) return;
  const rows = getFilteredTransactions();
  if (!rows.length) {
    table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:1rem;">Не найдено транзакций.</td></tr>';
    return;
  }
  table.innerHTML = rows.map(function (tx) {
    const debit = isAmountNegative(tx.direction) ? formatCurrency(tx.amount, tx.currency) : '—';
    const credit = isAmountNegative(tx.direction) ? '—' : formatCurrency(tx.amount, tx.currency);
    const balance = tx.balanceAfter ? formatCurrency(tx.balanceAfter, tx.currency) : '—';
    const created = tx.createdAt ? new Date(tx.createdAt) : null;
    const datetime = created ? created.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    return '<tr>' +
      '<td>' + datetime + '</td>' +
      '<td class="mono">' + (tx.document || tx.id) + '</td>' +
      '<td>' + tx.description + '</td>' +
      '<td>' + tx.counterparty + '</td>' +
      '<td class="' + (debit !== '—' ? 'amt-neg' : '') + '">' + debit + '</td>' +
      '<td class="' + (credit !== '—' ? 'amt-pos' : '') + '">' + credit + '</td>' +
      '<td>' + balance + '</td>' +
      '<td>' + getStatusBadge(tx.status) + '</td>' +
    '</tr>';
  }).join('');
}

function updatePaymentSourceOptions() {
  const select = document.getElementById('payment-source-account');
  if (!select) return;
  const user = getCurrentUser();
  const accounts = getAccessibleAccounts(user);
  select.innerHTML = accounts.map(function (acct) {
    return '<option value="' + acct.id + '">' + acct.name + ' · ' + formatCurrency(acct.balance, acct.currency) + ' (' + acct.currency + ')</option>';
  }).join('');
}

function updateStatementAccountOptions() {
  const select = document.getElementById('statement-account');
  if (!select) return;
  const user = getCurrentUser();
  const accounts = getAccessibleAccounts(user);
  select.innerHTML = '<option value="all">Все счета</option>' + accounts.map(function (acct) {
    return '<option value="' + acct.id + '">' + acct.name + '</option>';
  }).join('');
}

function refreshTransferForm() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const dateInput = document.getElementById('payment-date');
  const amountCurrency = document.getElementById('payment-currency-label');
  if (dateInput && !dateInput.value) dateInput.value = iso;
  const currencySelect = document.getElementById('payment-currency');
  if (currencySelect) {
    currencySelect.onchange = function () {
      if (amountCurrency) amountCurrency.textContent = this.value;
    };
  }
  const alertAccountant = document.getElementById('transfer-alert-accountant');
  const user = getCurrentUser();
  if (user && user.role === 'accountant') {
    if (alertAccountant) alertAccountant.style.display = '';
  } else {
    if (alertAccountant) alertAccountant.style.display = 'none';
  }
}

function updateDashboardClock() {
  const clock = document.getElementById('dash-clock');
  if (!clock) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function renderAppState() {
  updateDashboardSummary();
  renderVirtualAccounts();
  renderPendingPayments();
  renderLatestTransactions();
  renderTransferHistory();
  updatePaymentSourceOptions();
  updateStatementAccountOptions();
  updateStatementDateDefaults();
  applyStatementFilters(true);
  renderAnalytics();
  renderAudit();
  refreshTransferForm();
}

function applyStatementFilters(silent) {
  renderStatementTable();
  if (!silent) showToast('success', 'Фильтры применены', 'Список выписок обновлён.');
}

function saveDraftPayment() {
  showToast('success', 'Черновик сохранён', 'Поля платежа сохранены в текущей сессии.');
}

function submitPayment() {
  const user = getCurrentUser();
  if (!user) {
    showToast('error', 'Необходимо войти', 'Пожалуйста, войдите в систему перед созданием платежа.');
    return;
  }
  const sourceAccount = document.getElementById('payment-source-account');
  const iban = document.getElementById('payment-recipient-iban');
  const recipientName = document.getElementById('payment-recipient-name');
  const amountEl = document.getElementById('payment-amount');
  const typeEl = document.getElementById('payment-type');
  const purpose = document.getElementById('payment-purpose');
  const currency = document.getElementById('payment-currency');
  const dateInput = document.getElementById('payment-date');

  const sourceAccountId = sourceAccount ? sourceAccount.value : 'main';
  const amount = amountEl ? Number(amountEl.value) : 0;
  const txType = typeEl ? typeEl.value : 'payment';
  const description = purpose ? purpose.value.trim() : '';
  const recipient = recipientName ? recipientName.value.trim() : '';
  const ib = iban ? iban.value.trim() : '';
  const dateValue = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);

  if (!ib || !recipient || !description || !amount || amount <= 0) {
    showToast('error', 'Ошибка заполнения', 'Заполните IBAN, получателя, сумму и назначение платежа.');
    return;
  }
  const selectedAccount = getAccountById(sourceAccountId);
  if (!selectedAccount) {
    showToast('error', 'Счёт не найден', 'Выберите счёт списания.');
    return;
  }
  if (currency && currency.value !== selectedAccount.currency) {
    showToast('warning', 'Неподдерживаемая валюта', 'Выберите валюту счёта ' + selectedAccount.currency + '.');
    return;
  }
  const needsApproval = user.role !== 'director';
  const status = needsApproval ? 'pending' : 'approved';
  const txId = 'TX-' + Date.now();
  const actualAccountId = selectedAccount.id === 'main' ? 'main' : 'main';
  const newTx = {
    id: txId,
    document: txId,
    createdAt: dateValue + 'T' + new Date().toTimeString().slice(0,5) + ':00',
    type: txType,
    description: description,
    counterparty: recipient,
    accountId: actualAccountId,
    virtualId: selectedAccount.id !== 'main' ? selectedAccount.id : null,
    direction: 'out',
    amount: amount,
    currency: currency ? currency.value : 'KZT',
    status: status,
    createdBy: user.firstName + ' ' + user.lastName,
    approvedBy: needsApproval ? null : user.firstName + ' ' + user.lastName,
    balanceAfter: COMPANY_ROOT_ACCOUNT.balance - amount
  };
  TRANSACTIONS.unshift(newTx);

  if (!needsApproval) {
    if (selectedAccount.id === 'main') {
      COMPANY_ROOT_ACCOUNT.balance -= amount;
      COMPANY_ROOT_ACCOUNT.available -= amount;
    } else {
      selectedAccount.balance -= amount;
      COMPANY_ROOT_ACCOUNT.balance -= amount;
      COMPANY_ROOT_ACCOUNT.available -= amount;
    }
    showToast('success', 'Платёж выполнен', 'Средства списаны и добавлены в выписку.');
  } else {
    showToast('info', 'Платёж отправлен на рассмотрение', 'Директор получит заявку на подтверждение.');
  }
  renderAppState();
}

function approvePendingPayment(txId) {
  const user = getCurrentUser();
  if (!user || user.role !== 'director') {
    showToast('warning', 'Доступ запрещён', 'Только директор может подтверждать платежи.');
    return;
  }
  const tx = TRANSACTIONS.find(function (item) { return item.id === txId; });
  if (!tx || tx.status !== 'pending') return;
  const account = getAccountById(tx.virtualId || tx.accountId);
  if (!account) {
    showToast('error', 'Ошибка', 'Не удалось найти счёт для платежа.');
    return;
  }
  if (account.id !== 'main' && account.balance < tx.amount) {
    showToast('error', 'Недостаточно средств', 'На выбранном виртуальном счёте недостаточно средств для этого платежа.');
    return;
  }
  if (account.id === 'main' && COMPANY_ROOT_ACCOUNT.balance < tx.amount) {
    showToast('error', 'Недостаточно средств', 'На основном счёте недостаточно средств для этого платежа.');
    return;
  }
  tx.status = 'approved';
  tx.approvedBy = user.firstName + ' ' + user.lastName;
  tx.balanceAfter = (account.id === 'main' ? COMPANY_ROOT_ACCOUNT.balance - tx.amount : account.balance - tx.amount);
  if (account.id !== 'main') {
    account.balance -= tx.amount;
  }
  COMPANY_ROOT_ACCOUNT.balance -= tx.amount;
  COMPANY_ROOT_ACCOUNT.available -= tx.amount;
  syncNotificationsForPayment(txId);
  showToast('success', 'Платёж подтверждён', 'Средства списаны и добавлены в выписку.');
  renderAppState();
}

function rejectPendingPayment(txId) {
  const user = getCurrentUser();
  if (!user || user.role !== 'director') {
    showToast('warning', 'Доступ запрещён', 'Только директор может отклонять платежи.');
    return;
  }
  const tx = TRANSACTIONS.find(function (item) { return item.id === txId; });
  if (!tx || tx.status !== 'pending') return;
  tx.status = 'rejected';
  syncNotificationsForPayment(txId);
  showToast('info', 'Платёж отклонён', 'Заявка отклонена директором.');
  renderAppState();
}

function exportStatementExcel() {
  const rows = getFilteredTransactions();
  if (!rows.length) {
    showToast('warning', 'Нет данных', 'Нет транзакций для экспорта.');
    return;
  }
  let tableHtml = '<table><tr><th>Дата</th><th>Документ</th><th>Описание</th><th>Контрагент</th><th>Дебет</th><th>Кредит</th><th>Остаток</th><th>Статус</th><th>Автор</th><th>Подтвердил</th></tr>';
  rows.forEach(function (tx) {
    const debit = isAmountNegative(tx.direction) ? formatCurrency(tx.amount, tx.currency) : '—';
    const credit = isAmountNegative(tx.direction) ? '—' : formatCurrency(tx.amount, tx.currency);
    tableHtml += '<tr>' +
      '<td>' + (tx.createdAt ? tx.createdAt.slice(0,10) : '') + '</td>' +
      '<td>' + (tx.document || tx.id) + '</td>' +
      '<td>' + tx.description + '</td>' +
      '<td>' + tx.counterparty + '</td>' +
      '<td>' + debit + '</td>' +
      '<td>' + credit + '</td>' +
      '<td>' + (tx.balanceAfter ? formatCurrency(tx.balanceAfter, tx.currency) : '—') + '</td>' +
      '<td>' + tx.status + '</td>' +
      '<td>' + (tx.createdBy || '—') + '</td>' +
      '<td>' + (tx.approvedBy || '—') + '</td>' +
    '</tr>';
  });
  tableHtml += '</table>';
  downloadBlob('\ufeff' + tableHtml, 'application/vnd.ms-excel;charset=utf-8;', 'Выписка.xls');
}

function exportStatementPDF() {
  const rows = getFilteredTransactions();
  if (!rows.length) {
    showToast('warning', 'Нет данных', 'Нет транзакций для экспорта.');
    return;
  }
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Выписка</title><style>body{font-family:sans-serif;padding:20px;color:#18263f;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border:1px solid #dfe3e8;text-align:left;font-size:12px;}th{background:#f5f7fb;font-weight:700;}</style></head><body>' +
    '<h2>Выписка по операциям</h2>' +
    '<table><tr><th>Дата</th><th>Документ</th><th>Описание</th><th>Контрагент</th><th>Сумма</th><th>Статус</th><th>Автор</th><th>Подтвердил</th></tr>' +
    rows.map(function (tx) {
      return '<tr><td>' + (tx.createdAt ? tx.createdAt.slice(0,10) : '') + '</td>' +
        '<td>' + (tx.document || tx.id) + '</td>' +
        '<td>' + tx.description + '</td>' +
        '<td>' + tx.counterparty + '</td>' +
        '<td>' + (isAmountNegative(tx.direction) ? '−' : '+') + formatCurrency(tx.amount, tx.currency) + '</td>' +
        '<td>' + tx.status + '</td>' +
        '<td>' + (tx.createdBy || '—') + '</td>' +
        '<td>' + (tx.approvedBy || '—') + '</td></tr>';
    }).join('') +
    '</table></body></html>';
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 300);
  }
  showToast('info', 'PDF готовится', 'Откроется окно печати.');
}

function findRoleConfig(role) {
  if (!role) return null;
  const key = role.toString().toLowerCase().trim();
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
  renderAppState();
  if (typeof loadNotifications === 'function') loadNotifications();
}

function clearCurrentUser() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  setCurrentUser(null);
}

async function apiFetch(path, options = {}) {
  let url;
  if (path.startsWith('http')) {
    url = path;
  } else if (path.startsWith('/api')) {
    url = path; // уже полный прокси-путь
  } else if (path.startsWith('/')) {
    url = API_BASE + path; // /login → /api/login
  } else {
    url = API_BASE + '/' + path; // login → /api/login
  }
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

  // Show actual phone in step 2 and send OTP
  const phoneDisplay = document.getElementById('otp-phone-display');
  if (phoneDisplay) phoneDisplay.textContent = '📱 Отправлено на: ' + registrationData.phone;
  sendOtp();
}

async function sendOtp() {
  try {
    const resp = await apiFetch('/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: registrationData.phone })
    });
    const p = await resp.json().catch(function() { return {}; });
    if (!resp.ok) {
      showToast('error', 'Ошибка OTP', p.message || 'Не удалось отправить SMS.');
    } else {
      // В dev-режиме код виден в консоли сервера и в ответе
      if (p._devCode) {
        showToast('info', 'DEV: Код верификации', 'Код: ' + p._devCode + ' (или введите 000000)');
      } else {
        showToast('success', 'SMS отправлено', 'Введите код из SMS');
      }
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен. Запустите npm start.');
  }
}

async function submitRegStep2() {
  const inputs = document.querySelectorAll('#modal-reg-step2 .otp-input');
  const code = Array.from(inputs).map(function(i) { return i.value.trim(); }).join('');
  if (code.length !== 6) {
    showToast('warning', 'Введите код', 'Введите все 6 цифр из SMS.');
    return;
  }

  const btn = document.querySelector('#modal-reg-step2 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Проверка...'; }

  try {
    const resp = await apiFetch('/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: registrationData.phone, code: code })
    });
    const payload = await resp.json().catch(function() { return {}; });

    if (resp.ok && payload.verified) {
      closeModal('modal-reg-step2');
      openModal('modal-reg-step3');
    } else {
      showToast('error', 'Неверный код', payload.message || 'Код неверный или истёк. Попробуйте ещё раз.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Подтвердить →'; }
  }
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

/* ---------- Employees ---------- */

// Normalize snake_case API fields → camelCase used throughout the UI
function normalizeEmployee(emp) {
  return {
    id:         emp.id || emp.userId || '',
    userId:     emp.id || emp.userId || '',
    firstName:  emp.first_name  || emp.firstName  || '',
    lastName:   emp.last_name   || emp.lastName   || '',
    patronymic: emp.patronymic  || '',
    email:      emp.email       || '',
    iin:        emp.iin         || '',
    phone:      emp.phone       || '',
    position:   emp.position    || '',
    role:       emp.role        || '',
    status:     emp.status      || '',
    createdAt:  emp.created_at  || emp.createdAt  || null,
    bin:        emp.bin         || (emp.company && emp.company.bin) || ''
  };
}

const EMP_AVA_STYLES = [
  'background:linear-gradient(135deg,#c9a84c,#e2c06a);color:#0c2340;',
  'background:#eaf1fb;color:var(--navy2);',
  'background:var(--green-bg);color:var(--green);',
  'background:var(--blue-bg);color:var(--navy2);',
  'background:var(--orange-bg);color:var(--orange);',
];

function empAvaStyle(seed) {
  const n = seed ? (seed.charCodeAt ? seed.charCodeAt(0) : parseInt(seed, 16) || 0) : 0;
  return EMP_AVA_STYLES[Math.abs(n) % EMP_AVA_STYLES.length];
}

function empRoleBadge(role) {
  const cfg = findRoleConfig(role);
  return cfg
    ? '<span class="badge ' + cfg.badge + '">' + cfg.label + '</span>'
    : (role ? '<span class="badge">' + role + '</span>' : '');
}

function empStatusEl(status) {
  if (!status) return '<span style="color:var(--muted);">—</span>';
  const s = status.toLowerCase();
  if (s === 'active' || s === 'approved') return '<span style="color:var(--green);">● Активен</span>';
  if (s === 'blocked' || s === 'inactive') return '<span style="color:var(--red);">● Заблокирован</span>';
  if (s === 'pending') return '<span style="color:#a67c00;">● На рассмотрении</span>';
  return '<span style="color:var(--muted);">' + status + '</span>';
}

function renderEmployeeCard(emp) {
  const user = getStoredUser();
  const isDirector = user && user.role === 'director';
  const fullName = [emp.lastName, emp.firstName, emp.patronymic].filter(Boolean).join(' ') || emp.name || '—';
  const initials = getInitials(emp.firstName || '', emp.lastName || '');
  const userId = emp.id || emp.userId || '';
  const lastLogin = emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString('ru-KZ') : '—';
  const safeId = userId.replace(/'/g, '');
  const safeName = fullName.replace(/'/g, '');

  const docsBtn = isDirector
    ? '<button class="btn btn-sm btn-ghost" onclick="viewEmployeeDocs(\'' + safeId + '\',\'' + safeName + '\')">📄 Доп.</button>'
    : '';

  return '<div class="emp-card">' +
    '<div class="emp-card-header">' +
      '<div class="emp-ava" style="' + empAvaStyle(userId) + '">' + initials + '</div>' +
      '<div><div class="emp-name">' + fullName + '</div><div class="emp-pos">' + (emp.position || '') + '</div>' + empRoleBadge(emp.role) + '</div>' +
    '</div>' +
    '<div class="emp-info">' +
      '<div class="emp-info-item"><div class="emp-info-lbl">ИИН</div><div class="emp-info-val">' + (emp.iin || '—') + '</div></div>' +
      '<div class="emp-info-item"><div class="emp-info-lbl">Телефон</div><div class="emp-info-val">' + (emp.phone || '—') + '</div></div>' +
      '<div class="emp-info-item"><div class="emp-info-lbl">Статус</div><div class="emp-info-val">' + empStatusEl(emp.status) + '</div></div>' +
      '<div class="emp-info-item"><div class="emp-info-lbl">Последний вход</div><div class="emp-info-val">' + lastLogin + '</div></div>' +
    '</div>' +
    '<div class="emp-actions">' +
      docsBtn +
      '<button class="btn btn-sm btn-ghost" onclick="openModal(\'modal-employee-perms\')">Права</button>' +
    '</div>' +
  '</div>';
}

function renderPendingCard(emp) {
  const fullName = [emp.lastName, emp.firstName, emp.patronymic].filter(Boolean).join(' ') || emp.name || '—';
  const initials = getInitials(emp.firstName || '', emp.lastName || '');
  const userId = emp.id || emp.userId || '';
  const safeId = userId.replace(/'/g, '');
  const safeName = fullName.replace(/'/g, '');

  return '<div class="emp-card" style="border-color:rgba(166,124,0,0.35);background:#fffbf0;">' +
    '<div class="emp-card-header">' +
      '<div class="emp-ava" style="background:#fff8e1;color:#a67c00;">' + initials + '</div>' +
      '<div>' +
        '<div class="emp-name">' + fullName + '</div>' +
        '<div class="emp-pos">' + (emp.position || '—') + '</div>' +
        '<span class="badge badge-pending">На рассмотрении</span>' +
      '</div>' +
    '</div>' +
    '<div class="emp-info">' +
      '<div class="emp-info-item"><div class="emp-info-lbl">ИИН</div><div class="emp-info-val">' + (emp.iin || '—') + '</div></div>' +
      '<div class="emp-info-item"><div class="emp-info-lbl">Должность</div><div class="emp-info-val">' + (emp.position || '—') + '</div></div>' +
    '</div>' +
    '<div style="display:flex;gap:0.65rem;flex-wrap:wrap;align-items:center;">' +
      '<button class="btn btn-sm btn-primary" style="flex:1;" onclick="openEmpDetailFromMap(\'' + safeId + '\')">📋 Просмотр и подтверждение</button>' +
      '<button class="btn btn-sm btn-danger" onclick="_doRejectEmployee(\'' + safeId + '\',\'' + safeName + '\',null)">✕</button>' +
    '</div>' +
  '</div>';
}

let _pendingEmpMap = {};

async function loadEmployees() {
  const user = getStoredUser();
  const companyId = user && (user.companyId || (user.company && user.company.id));
  const grid = document.getElementById('emp-list');
  const pendingSection = document.getElementById('emp-pending-section');
  const pendingList = document.getElementById('emp-pending-list');
  const pendingCount = document.getElementById('emp-pending-count');

  if (!companyId) {
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Не удалось определить компанию.</div>';
    return;
  }
  if (grid) grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Загрузка...</div>';

  try {
    const resp = await apiFetch('/employees/' + companyId);
    if (!resp.ok) {
      if (grid) grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Не удалось загрузить список сотрудников.</div>';
      showToast('error', 'Ошибка', 'Не удалось загрузить список сотрудников.');
      return;
    }
    const data = await resp.json().catch(() => []);
    const raw = Array.isArray(data) ? data : (data.employees || data.data || []);
    const employees = raw.map(normalizeEmployee);

    const isDirector = user && user.role === 'director';
    const pending = employees.filter(function(e) {
      return e.status && e.status.toLowerCase() === 'pending';
    });
    const active = employees.filter(function(e) {
      return !e.status || e.status.toLowerCase() !== 'pending';
    });

    // Populate map for detail modal access from pending cards
    _pendingEmpMap = {};
    pending.forEach(function(emp) {
      if (emp.id) _pendingEmpMap[emp.id] = emp;
    });

    if (pendingSection) {
      if (isDirector && pending.length > 0) {
        pendingSection.style.display = '';
        if (pendingCount) pendingCount.textContent = pending.length;
        if (pendingList) pendingList.innerHTML = pending.map(renderPendingCard).join('');
      } else {
        pendingSection.style.display = 'none';
      }
    }

    if (grid) {
      if (active.length === 0) {
        grid.innerHTML = employees.length === 0
          ? '<div style="text-align:center;padding:2rem;color:var(--muted);">Сотрудники не найдены.</div>'
          : '';
      } else {
        grid.innerHTML = active.map(renderEmployeeCard).join('') +
          '<div class="emp-card" style="border:2px dashed var(--light);background:transparent;display:flex;align-items:center;justify-content:center;min-height:200px;">' +
            '<div style="text-align:center;cursor:pointer;" onclick="openModal(\'modal-add-employee\')">' +
              '<div style="font-size:2.5rem;margin-bottom:0.75rem;opacity:0.4;">+</div>' +
              '<div style="font-size:0.85rem;font-weight:700;color:var(--muted);">Добавить сотрудника</div>' +
            '</div>' +
          '</div>';
      }
    }
  } catch (e) {
    if (grid) grid.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Ошибка загрузки.</div>';
    console.error('loadEmployees error:', e);
  }
}

async function approveEmployee(userId, name) {
  const roleEl = document.getElementById('role-select-' + userId);
  const role = roleEl ? roleEl.value : '';
  if (!role) {
    showToast('warning', 'Выберите роль', 'Укажите роль сотрудника перед одобрением.');
    return;
  }

  try {
    const resp = await apiFetch('/employees/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, role: role })
    });
    const payload = await resp.json().catch(() => ({}));
    if (resp.ok) {
      showToast('success', 'Сотрудник одобрен', name + ' добавлен в систему.');
      loadEmployees();
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось одобрить сотрудника.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('approveEmployee error:', e);
  }
}

async function rejectEmployee(userId, name) {
  if (!window.confirm('Отклонить заявку сотрудника «' + name + '»?')) return;

  try {
    const resp = await apiFetch('/employees/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    const payload = await resp.json().catch(() => ({}));
    if (resp.ok) {
      showToast('info', 'Заявка отклонена', 'Заявка ' + name + ' отклонена.');
      loadEmployees();
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось отклонить заявку.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('rejectEmployee error:', e);
  }
}

async function viewEmployeeDocs(userId, name) {
  const modal = document.getElementById('modal-employee-docs');
  const titleEl = document.getElementById('emp-docs-name');
  const bodyEl = document.getElementById('emp-docs-body');
  if (!modal) return;

  if (titleEl) titleEl.textContent = name || '';
  if (bodyEl) bodyEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted);">Загрузка документов...</div>';
  openModal('modal-employee-docs');

  try {
    const resp = await apiFetch('/documents/' + userId);
    if (!resp.ok) {
      if (bodyEl) bodyEl.innerHTML = '<div class="alert alert-warning">Документы не найдены или доступ запрещён.</div>';
      return;
    }
    const data = await resp.json().catch(() => []);
    const docs = Array.isArray(data) ? data : (data.documents || data.docs || []);

    if (!docs.length) {
      if (bodyEl) bodyEl.innerHTML = '<div class="alert alert-info">Документы не загружены.</div>';
      return;
    }

    if (bodyEl) {
      bodyEl.innerHTML = docs.map(function(doc) {
        const docName = doc.name || doc.fileName || doc.type || 'Документ';
        const url = doc.url || doc.fileUrl || doc.path || '';
        const type = doc.type || doc.documentType || '';
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem;background:var(--off);border-radius:8px;margin-bottom:0.5rem;">' +
          '<span style="font-size:1.4rem;">📄</span>' +
          '<div style="flex:1;">' +
            '<div style="font-weight:700;font-size:0.85rem;">' + docName + '</div>' +
            (type ? '<div style="font-size:0.72rem;color:var(--muted);">' + type + '</div>' : '') +
          '</div>' +
          (url ? '<a href="' + url + '" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">Открыть</a>' : '<span style="font-size:0.75rem;color:var(--muted);">Недоступно</span>') +
        '</div>';
      }).join('');
    }
  } catch (e) {
    if (bodyEl) bodyEl.innerHTML = '<div class="alert alert-warning">Ошибка загрузки документов.</div>';
    console.error('viewEmployeeDocs error:', e);
  }
}

/* ---------- Notifications ---------- */

// Local cache populated from GET /api/notifications
let NOTIFICATIONS = [];
let _notifFilter = 'all';
let AUDIT_EXTRA_EVENTS = [];
const AUDIT_CLIENT_IP = '178.88.42.156';

function auditRoleBadge(role) {
  if (!role) return '';
  const key = role.toLowerCase();
  if (key === 'director' || key === 'директор') return '<span class="badge badge-director" style="font-size:0.55rem;">Директор</span>';
  if (key.includes('fin')) return '<span class="badge badge-findirector" style="font-size:0.55rem;">Фин.дир</span>';
  if (key.includes('manager') || key.includes('рук')) return '<span class="badge badge-manager" style="font-size:0.55rem;">Рук-ль</span>';
  if (key.includes('accountant') || key.includes('бух')) return '<span class="badge badge-accountant" style="font-size:0.55rem;">Бухг.</span>';
  return '<span class="badge" style="font-size:0.55rem;">' + role + '</span>';
}

function getAuditRows() {
  const txRows = TRANSACTIONS.reduce(function (rows, tx) {
    const createdAt = tx.createdAt ? new Date(tx.createdAt) : new Date();
    rows.push({
      timestamp: createdAt,
      userName: tx.createdBy || 'Неизвестно',
      userRole: '',
      action: 'Создание платежа',
      object: tx.document || tx.id,
      ip: AUDIT_CLIENT_IP,
      result: tx.status === 'approved' ? '✓ Успех' : tx.status === 'pending' ? '⏳ Ожидает' : '✗ Отклонён'
    });
    if (tx.status === 'approved' && tx.approvedBy && tx.approvedBy !== tx.createdBy) {
      rows.push({
        timestamp: createdAt,
        userName: tx.approvedBy,
        userRole: 'director',
        action: 'Подтверждение платежа',
        object: tx.document || tx.id,
        ip: AUDIT_CLIENT_IP,
        result: '✓ Успех'
      });
    }
    return rows;
  }, []);
  return txRows.concat(AUDIT_EXTRA_EVENTS).sort(function (a, b) {
    return b.timestamp - a.timestamp;
  });
}

function logAuditEvent(event) {
  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
  AUDIT_EXTRA_EVENTS.unshift({
    timestamp: timestamp,
    userName: event.userName || 'Неизвестно',
    userRole: event.userRole || '',
    action: event.action || 'Действие',
    object: event.object || '—',
    ip: event.ip || AUDIT_CLIENT_IP,
    result: event.result || '✓ Успех'
  });
  if (AUDIT_EXTRA_EVENTS.length > 80) AUDIT_EXTRA_EVENTS.length = 80;
  renderAudit();
}

function renderAudit() {
  const body = document.getElementById('audit-table-body');
  if (!body) return;
  const rows = getAuditRows();
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1rem;">Нет записей аудита.</td></tr>';
    return;
  }
  body.innerHTML = rows.slice(0, 40).map(function (evt) {
    const time = evt.timestamp ? evt.timestamp.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    const role = auditRoleBadge(evt.userRole);
    const resultClass = evt.result.includes('Успех') ? 'badge-active' : evt.result.includes('Ожидает') ? 'badge-pending' : evt.result.includes('Блок') || evt.result.includes('Ошибка') || evt.result.includes('Отклонён') ? 'badge-danger' : 'badge';
    return '<tr><td>' + time + '</td><td>' + evt.userName + ' ' + role + '</td><td>' + evt.action + '</td><td>' + evt.object + '</td><td class="mono">' + evt.ip + '</td><td><span class="badge ' + resultClass + '" style="font-size:0.62rem;">' + evt.result + '</span></td></tr>';
  }).join('');
}

function buildLocalNotifications() {
  return TRANSACTIONS.filter(function (tx) { return tx.status === 'pending'; }).map(function (tx) {
    const time = tx.createdAt ? new Date(tx.createdAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : new Date().toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    return {
      id: 'local-notif-' + tx.id,
      type: 'payment',
      icon: '⚠️',
      iconBg: 'var(--orange-bg)',
      title: 'Требуется подтверждение платежа',
      text: 'Платёж ' + (tx.document || tx.id) + ' на сумму ' + formatCurrency(tx.amount, tx.currency) + ' ожидает подтверждения. Получатель: ' + tx.counterparty + '.',
      time: time,
      read: false,
      paymentId: tx.id,
      action: { label: '✓ Подтвердить', style: 'btn-primary' }
    };
  });
}

function syncNotificationsForPayment(txId) {
  NOTIFICATIONS.forEach(function (notif) {
    if (notif.paymentId === txId) {
      notif.read = true;
      if (notif.id && notif.id.startsWith('local-notif-')) {
        notif.title = 'Платёж подтверждён';
        notif.text = 'Платёж ' + txId + ' был подтверждён директором.';
        notif.action = null;
      }
    }
  });
}

// Map API notification types → UI shape
const NOTIF_TYPE_MAP = {
  'NEW_EMPLOYEE_REQUEST': { type: 'employee', icon: '👤', iconBg: 'var(--gold-bg)',   title: 'Новая заявка на регистрацию' },
  'PAYMENT_PENDING':      { type: 'payment',  icon: '⚠️', iconBg: 'var(--orange-bg)', title: 'Ожидает подтверждения платёж' },
  'PAYMENT_RECEIVED':     { type: 'payment',  icon: '✅', iconBg: 'var(--green-bg)',  title: 'Поступление средств' },
  'SYSTEM':               { type: 'system',   icon: '🔧', iconBg: 'var(--off)',        title: 'Системное уведомление' }
};

function mapApiNotification(n) {
  const meta = NOTIF_TYPE_MAP[n.type] || { type: 'system', icon: 'ℹ️', iconBg: 'var(--off)', title: n.type };
  const timeStr = n.created_at
    ? new Date(n.created_at).toLocaleString('ru-KZ', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';
  const notif = {
    id:     n.id,
    type:   meta.type,
    icon:   meta.icon,
    iconBg: meta.iconBg,
    title:  meta.title,
    text:   n.message || '',
    time:   timeStr,
    read:   !!n.is_read
  };
  // Attach employee data for NEW_EMPLOYEE_REQUEST
  if (n.type === 'NEW_EMPLOYEE_REQUEST' && n.user) {
    notif.userId   = n.user.id;
    notif.userName = n.user.full_name || '';
    notif.empData  = {
      id:       n.user.id,
      userId:   n.user.id,
      firstName: (n.user.full_name || '').split(' ')[1] || '',
      lastName:  (n.user.full_name || '').split(' ')[0] || '',
      patronymic:(n.user.full_name || '').split(' ')[2] || '',
      iin:       n.user.iin      || '',
      position:  n.user.position || '',
      status:    'pending'
    };
    notif.actionPayload = n.action_payload || {};
  }
  // Attach paymentId for PAYMENT_PENDING
  if (n.type === 'PAYMENT_PENDING' && n.action_payload) {
    notif.paymentId = n.action_payload.paymentId;
    notif.action = { label: '✓ Подтвердить', style: 'btn-primary' };
  }
  return notif;
}

async function loadNotifications() {
  try {
    const resp = await apiFetch('/notifications');
    if (!resp.ok) {
      NOTIFICATIONS = buildLocalNotifications();
      renderNotifications();
      updateBellBadge();
      return;
    }
    const data = await resp.json().catch(function() { return {}; });
    const list = data.notifications || [];
    if (list.length) {
      NOTIFICATIONS = list.map(mapApiNotification);
    } else {
      NOTIFICATIONS = buildLocalNotifications();
    }
    renderNotifications();
    updateBellBadge();
  } catch (e) {
    console.error('loadNotifications error:', e);
    NOTIFICATIONS = buildLocalNotifications();
    renderNotifications();
    updateBellBadge();
  }
}

function updateBellBadge() {
  const badge = document.getElementById('notif-bell-badge');
  const dot   = document.querySelector('#notif-bell .tb-dot');
  const unread = NOTIFICATIONS.filter(function(n) { return !n.read; }).length;

  if (badge) {
    badge.textContent = unread > 9 ? '9+' : (unread || '');
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
  if (dot) dot.style.display = unread > 0 ? '' : 'none';
}

function markNotifRead(id) {
  const notif = NOTIFICATIONS.find(function(n) { return n.id === id; });
  if (notif && !notif.read) {
    notif.read = true;
    renderNotifications();
    updateBellBadge();
    // Persist to API (fire-and-forget)
    apiFetch('/notifications/' + id + '/read', { method: 'PATCH' }).catch(function() {});
  }
}

function markAllNotifRead() {
  NOTIFICATIONS.forEach(function(n) { n.read = true; });
  renderNotifications();
  updateBellBadge();
  apiFetch('/notifications/read-all', { method: 'PATCH' }).catch(function() {});
}

function filterNotifications(cat) {
  _notifFilter = cat;
  document.querySelectorAll('[data-notif-filter]').forEach(function(btn) {
    const active = btn.getAttribute('data-notif-filter') === cat;
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-ghost', !active);
  });
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const filtered = _notifFilter === 'all'
    ? NOTIFICATIONS.slice()
    : NOTIFICATIONS.filter(function(n) { return n.type === _notifFilter; });

  // Update unread badge count in "Все" tab
  const allBadge = document.getElementById('notif-unread-count');
  const unread = NOTIFICATIONS.filter(function(n) { return !n.read; }).length;
  if (allBadge) {
    allBadge.textContent = unread;
    allBadge.style.display = unread > 0 ? '' : 'none';
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted);">Нет уведомлений в этой категории.</div>';
    updateBellBadge();
    return;
  }

  list.innerHTML = filtered.map(function(n) {
    const unreadCls = n.read ? '' : ' unread';
    const dot = n.read ? '' : '<span style="display:inline-block;width:7px;height:7px;background:var(--red);border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0;"></span>';

    let actionHtml = '';
    if (n.type === 'employee' && n.userId) {
      const safeId = n.id.replace(/'/g, '');
      actionHtml = '<button class="btn btn-sm btn-primary" style="flex-shrink:0;white-space:nowrap;" onclick="event.stopPropagation();openEmpDetail(\'' + safeId + '\')">Подробнее →</button>';
    } else if (n.action) {
      const handler = n.paymentId ? 'handleNotificationAction(\'' + n.id + '\')' : 'markNotifRead(\'' + n.id + '\')';
      actionHtml = '<button class="btn btn-sm ' + n.action.style + '" style="flex-shrink:0;" onclick="event.stopPropagation();' + handler + '">' + n.action.label + '</button>';
    }

    return '<div class="notif-item' + unreadCls + '" onclick="markNotifRead(\'' + n.id + '\')" style="cursor:pointer;">' +
      '<div class="notif-ico" style="background:' + n.iconBg + ';">' + n.icon + '</div>' +
      '<div class="notif-body">' +
        '<div class="notif-title" style="display:flex;align-items:center;">' + n.title + dot + '</div>' +
        '<div class="notif-text">' + n.text + '</div>' +
        '<div class="notif-time">' + n.time + '</div>' +
      '</div>' +
      actionHtml +
    '</div>';
  }).join('');

  updateBellBadge();
}

function handleNotificationAction(notifId) {
  const notif = NOTIFICATIONS.find(function (n) { return n.id === notifId; });
  if (!notif) return;
  if (notif.type === 'payment' && notif.paymentId) {
    const user = getCurrentUser();
    if (!user || user.role !== 'director') {
      showToast('warning', 'Доступ запрещён', 'Только директор может подтверждать платежи.');
      return;
    }
    approvePendingPayment(notif.paymentId);
    markNotifRead(notifId);
    return;
  }
  markNotifRead(notifId);
}

// syncEmployeeNotifications removed — notifications now come from GET /api/notifications

/* ---------- Employee detail modal ---------- */

let _currentDetailEmp = null;

function openEmpDetailFromMap(userId) {
  const emp = _pendingEmpMap[userId];
  if (emp) openEmpDetailWithData(emp);
  else showToast('error', 'Ошибка', 'Данные сотрудника не найдены.');
}

function openEmpDetail(notifId) {
  const notif = NOTIFICATIONS.find(function(n) { return n.id === notifId; });
  if (!notif) return;
  if (notif.empData) {
    openEmpDetailWithData(notif.empData);
  } else {
    // No cached data — try lookup by userId in pending map
    const emp = notif.userId ? _pendingEmpMap[notif.userId] : null;
    if (emp) openEmpDetailWithData(emp);
    else showToast('error', 'Данные не найдены', 'Откройте раздел «Сотрудники» для обновления.');
  }
}

function openEmpDetailWithData(emp) {
  _currentDetailEmp = emp;

  const fullName = [emp.lastName, emp.firstName, emp.patronymic].filter(Boolean).join(' ') || emp.name || '—';
  const initials = getInitials(emp.firstName || '', emp.lastName || '');

  const set = function(id, val) {
    const el = document.getElementById(id);
    if (el) { if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.value = val || ''; else el.textContent = val || '—'; }
  };

  set('emp-detail-name', fullName);
  set('emp-detail-position', emp.position || '—');
  set('emp-detail-iin', emp.iin || '');
  set('emp-detail-phone', emp.phone || '');
  set('emp-detail-email', emp.email || '');
  set('emp-detail-pos', emp.position || '');
  set('emp-detail-bin', emp.bin || (emp.company && emp.company.bin) || '');
  set('emp-detail-date', emp.createdAt ? new Date(emp.createdAt).toLocaleDateString('ru-KZ') : 'Нет данных');

  const ava = document.getElementById('emp-detail-ava');
  if (ava) ava.textContent = initials;

  const roleEl = document.getElementById('emp-detail-role');
  if (roleEl) roleEl.value = '';

  const permsDiv = document.getElementById('emp-detail-perms');
  if (permsDiv) permsDiv.style.display = 'none';

  // Wire role select → permissions preview
  if (roleEl && permsDiv) {
    roleEl.onchange = function() {
      const cfg = findRoleConfig(this.value);
      if (cfg && cfg.perms && cfg.perms.length) {
        permsDiv.style.display = '';
        permsDiv.innerHTML = '<strong>Права роли «' + cfg.label + '»:</strong> ' + cfg.perms.join(' · ');
      } else {
        permsDiv.style.display = 'none';
      }
    };
  }

  openModal('modal-emp-detail');
}

function approveEmpFromDetail() {
  const emp = _currentDetailEmp;
  if (!emp) return;
  const roleEl = document.getElementById('emp-detail-role');
  const role = roleEl ? roleEl.value : '';
  if (!role) {
    showToast('warning', 'Выберите роль', 'Укажите роль сотрудника перед подтверждением.');
    return;
  }
  const userId = emp.id || emp.userId || '';
  const fullName = [emp.lastName, emp.firstName, emp.patronymic].filter(Boolean).join(' ') || emp.name || '—';
  const notif = NOTIFICATIONS.find(function(n) { return n.userId === userId; });
  closeModal('modal-emp-detail');
  _doApproveEmployee(userId, fullName, role, notif ? notif.id : null);
}

function rejectEmpFromDetail() {
  const emp = _currentDetailEmp;
  if (!emp) return;
  const fullName = [emp.lastName, emp.firstName, emp.patronymic].filter(Boolean).join(' ') || emp.name || '—';
  if (!window.confirm('Отклонить заявку «' + fullName + '»?')) return;
  const userId = emp.id || emp.userId || '';
  const notif = NOTIFICATIONS.find(function(n) { return n.userId === userId; });
  closeModal('modal-emp-detail');
  _doRejectEmployee(userId, fullName, notif ? notif.id : null);
}

async function _doApproveEmployee(userId, name, role, notifId) {
  try {
    const resp = await apiFetch('/employees/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, role: role })
    });
    const payload = await resp.json().catch(function() { return {}; });
    if (resp.ok) {
      if (notifId) {
        const idx = NOTIFICATIONS.findIndex(function(n) { return n.id === notifId; });
        if (idx !== -1) NOTIFICATIONS.splice(idx, 1);
      }
      loadNotifications();
      loadEmployees();
      const cfg = findRoleConfig(role);
      const roleLabel = cfg ? cfg.label : role;
      showToast('success', '✅ Кабинет открыт!',
        'Сотрудник «' + name + '» одобрен как «' + roleLabel + '». ' +
        'Кабинет активирован — сотрудник может войти по ИИН и паролю.');
      logAuditEvent({
        userName: (window._currentUser && (_currentUser.firstName + ' ' + _currentUser.lastName)) || 'Директор',
        userRole: 'director',
        action: 'Одобрение сотрудника',
        object: name + ' (' + roleLabel + ')',
        result: '✓ Кабинет создан'
      });
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось подтвердить заявку.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('_doApproveEmployee error:', e);
  }
}

async function _doRejectEmployee(userId, name, notifId) {
  try {
    const resp = await apiFetch('/employees/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    const payload = await resp.json().catch(function() { return {}; });
    if (resp.ok) {
      if (notifId) {
        const idx = NOTIFICATIONS.findIndex(function(n) { return n.id === notifId; });
        if (idx !== -1) NOTIFICATIONS.splice(idx, 1);
      }
      loadNotifications();
      loadEmployees();
      showToast('info', 'Заявка отклонена', 'Заявка «' + name + '» отклонена.');
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось отклонить заявку.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('_doRejectEmployee error:', e);
  }
}

/* kept for backward compat — delegates to new detail-modal flow */
async function approveFromNotif(notifId, userId, name) {
  const roleEl = document.getElementById('notif-role-' + notifId);
  const role = roleEl ? roleEl.value : '';
  if (!role) {
    openEmpDetail(notifId);
    return;
  }

  try {
    const resp = await apiFetch('/employees/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, role: role })
    });
    const payload = await resp.json().catch(function() { return {}; });
    if (resp.ok) {
      const idx = NOTIFICATIONS.findIndex(function(n) { return n.id === notifId; });
      if (idx !== -1) NOTIFICATIONS.splice(idx, 1);
      renderNotifications();
      updateBellBadge();
      showToast('success', 'Сотрудник одобрен', name + ' добавлен в систему.');
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось одобрить сотрудника.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('approveFromNotif error:', e);
  }
}

async function rejectFromNotif(notifId, userId, name) {
  if (!window.confirm('Отклонить заявку «' + name + '»?')) return;

  try {
    const resp = await apiFetch('/employees/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    const payload = await resp.json().catch(function() { return {}; });
    if (resp.ok) {
      const idx = NOTIFICATIONS.findIndex(function(n) { return n.id === notifId; });
      if (idx !== -1) NOTIFICATIONS.splice(idx, 1);
      renderNotifications();
      updateBellBadge();
      showToast('info', 'Заявка отклонена', 'Заявка «' + name + '» отклонена.');
    } else {
      showToast('error', 'Ошибка', payload.message || payload.error || 'Не удалось отклонить заявку.');
    }
  } catch (e) {
    showToast('error', 'Ошибка', 'Сервер недоступен.');
    console.error('rejectFromNotif error:', e);
  }
}

/* ---------- Permissions ---------- */
function checkPerm(action, paneId) {
  const user = getCurrentUser();
  const cfg = findRoleConfig(user?.role);
  const canAccess = cfg && cfg.nav && cfg.nav.includes(paneId);
  if (canAccess) {
    showPane(paneId);
    return true;
  }
  const paneLabels = {
    'pane-dashboard': 'Главная панель',
    'pane-transfer': 'Платежи',
    'pane-statements': 'Выписки',
    'pane-analytics': 'Аналитика',
    'pane-employees': 'Сотрудники',
    'pane-settings': 'Настройки'
  };
  showToast('warning', 'Доступ запрещён', 'У вас нет прав на раздел «' + (paneLabels[paneId] || paneId) + '».');
  return false;
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

  // Инициализация live clock
  updateDashboardClock();
  setInterval(updateDashboardClock, 1000 * 60);

  // Инициализация bell badge
  updateBellBadge();

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