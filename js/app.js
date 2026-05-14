// ============================================================
// STORAGE KEYS
// ============================================================
const STORAGE_KEY    = 'budgetTracker_v3';
const CATEGORIES_KEY = 'budgetTracker_categories';
const THEME_KEY      = 'budgetTracker_theme';

// ============================================================
// STATE
// ============================================================
let transactions     = [];
let customCategories = [];
let chart            = null;
let currentSort      = 'date-desc';
let currentType      = 'expense';   // active form type
let filterPeriod     = 'all';       // 'all' | 'today' | 'week' | 'month' | 'YYYY-MM'
let filterType       = 'all';

// ============================================================
// DEFAULT CATEGORIES
// ============================================================
const DEFAULT_EXPENSE_CATEGORIES = ['Makanan & Minuman', 'Transport', 'Hiburan'];
const DEFAULT_INCOME_CATEGORIES  = ['Gaji'];

// Color palette — index maps to getAllCategories() order
const COLOR_PALETTE = [
    '#0071e3', '#34c759', '#ff9f0a', '#ff375f',
    '#bf5af2', '#5ac8fa', '#ff6b35', '#30d158',
    '#64d2ff', '#ffd60a', '#ff453a', '#ac8e68',
    '#6e6e73', '#007aff', '#5856d6', '#ff2d55'
];

// ============================================================
// INIT
// ============================================================
function init() {
    loadTheme();
    loadCategories();
    loadTransactions();
    setupEventListeners();
    rebuildCategorySelect();
    renderCustomCategoryList();
    populateMonthFilter();
    showMonthPicker(false);
    updateUI();
}

// ============================================================
// THEME
// ============================================================
function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if (chart) { chart.destroy(); chart = null; }
    updateChart();
}

// ============================================================
// CATEGORIES
// ============================================================
function loadCategories() {
    try {
        const stored = localStorage.getItem(CATEGORIES_KEY);
        customCategories = stored ? JSON.parse(stored) : [];
    } catch { customCategories = []; }
}

function saveCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customCategories));
}

function getAllCategories() {
    return [
        ...DEFAULT_EXPENSE_CATEGORIES,
        ...DEFAULT_INCOME_CATEGORIES,
        ...customCategories
    ];
}

function getCategoryColor(category) {
    const all = getAllCategories();
    const idx = all.indexOf(category);
    return COLOR_PALETTE[idx >= 0 ? idx % COLOR_PALETTE.length : COLOR_PALETTE.length - 1];
}

function addCustomCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, msg: 'Nama kategori tidak boleh kosong.' };

    const existing = getAllCategories().map(c => c.toLowerCase());
    if (existing.includes(trimmed.toLowerCase())) {
        return { ok: false, msg: `Kategori "${trimmed}" sudah ada.` };
    }

    customCategories.push(trimmed);
    saveCategories();
    return { ok: true };
}

function deleteCustomCategory(name) {
    // Prevent deletion if any transaction uses this category
    const inUse = transactions.some(t => t.category === name);
    if (inUse) {
        return { ok: false, msg: `Kategori "${name}" sedang digunakan oleh transaksi.` };
    }
    customCategories = customCategories.filter(c => c !== name);
    saveCategories();
    return { ok: true };
}

function rebuildCategorySelect() {
    const select  = document.getElementById('category');
    const current = select.value;

    select.innerHTML = '<option value="">Pilih kategori</option>';

    getAllCategories().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });

    if (current && getAllCategories().includes(current)) {
        select.value = current;
    }
}

function renderCustomCategoryList() {
    const container = document.getElementById('customCategoryList');
    if (customCategories.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = customCategories.map(cat => `
        <div class="custom-category-item">
            <div class="custom-category-dot" style="background:${getCategoryColor(cat)}"></div>
            <span class="custom-category-name">${escapeHtml(cat)}</span>
            <button class="btn-delete-category" onclick="handleDeleteCategory('${escapeAttr(cat)}')" title="Hapus kategori">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function handleDeleteCategory(name) {
    const errorEl = document.getElementById('categoryError');
    const result  = deleteCustomCategory(name);
    if (!result.ok) {
        errorEl.textContent = result.msg;
        return;
    }
    errorEl.textContent = '';
    rebuildCategorySelect();
    renderCustomCategoryList();
    updateCategoryBreakdown();
    updateChart();
}

// ============================================================
// STORAGE
// ============================================================
function loadTransactions() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        transactions = stored ? JSON.parse(stored) : [];
    } catch { transactions = []; }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ============================================================
// AMOUNT INPUT — live IDR formatting
// ============================================================
function setupAmountInput() {
    const display = document.getElementById('amountDisplay');
    const hidden  = document.getElementById('amountHidden');

    display.addEventListener('input', function () {
        // Strip everything except digits
        const raw = this.value.replace(/\D/g, '');
        hidden.value = raw;

        if (raw === '') {
            this.value = '';
            return;
        }

        // Format with thousand separators (id-ID uses dot as separator)
        const num = parseInt(raw, 10);
        this.value = num.toLocaleString('id-ID');
    });

    // On focus: keep formatted but allow editing
    display.addEventListener('keydown', function (e) {
        // Allow: backspace, delete, tab, escape, arrows, home, end
        const allowed = [8, 9, 27, 46, 37, 38, 39, 40, 35, 36];
        if (allowed.includes(e.keyCode)) return;
        // Block non-numeric
        if (e.key && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    });
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('sortSelect').addEventListener('change', e => {
        currentSort = e.target.value;
        updateTransactionList();
    });
    document.getElementById('periodFilter').addEventListener('change', e => {
        const val = e.target.value;
        if (val === 'pick') {
            // Show month picker, wait for user to choose a month
            showMonthPicker(true);
            // Don't apply filter yet — wait for monthFilter change
            return;
        }
        showMonthPicker(false);
        filterPeriod = val;
        applyFilters();
    });

    document.getElementById('monthFilter').addEventListener('change', e => {
        const val = e.target.value;
        if (!val) return;                // placeholder selected
        filterPeriod = val;              // e.g. '2025-05'
        applyFilters();
    });
    document.getElementById('typeFilter').addEventListener('change', e => {
        filterType = e.target.value;
        updateTransactionList();
    });
    document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);
    document.getElementById('newCategoryInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
    });

    // Type toggle buttons
    document.getElementById('btnExpense').addEventListener('click', () => setFormType('expense'));
    document.getElementById('btnIncome').addEventListener('click',  () => setFormType('income'));

    setupAmountInput();
}

function setFormType(type) {
    currentType = type;
    document.getElementById('btnExpense').classList.toggle('active', type === 'expense');
    document.getElementById('btnIncome').classList.toggle('active',  type === 'income');

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = type === 'expense' ? 'Tambah Pengeluaran' : 'Tambah Pemasukan';
    submitBtn.classList.toggle('income-mode', type === 'income');
}

function handleAddCategory() {
    const input   = document.getElementById('newCategoryInput');
    const errorEl = document.getElementById('categoryError');
    const result  = addCustomCategory(input.value);

    if (!result.ok) { errorEl.textContent = result.msg; return; }

    errorEl.textContent = '';
    input.value = '';
    rebuildCategorySelect();
    renderCustomCategoryList();
    updateCategoryBreakdown();
    updateChart();
}

// ============================================================
// FORM SUBMIT
// ============================================================
function handleFormSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('formError');

    const itemName = document.getElementById('itemName').value.trim();
    const rawAmt   = document.getElementById('amountHidden').value;
    const category = document.getElementById('category').value;

    if (!itemName || !rawAmt || !category) {
        errorEl.textContent = 'Semua kolom wajib diisi.';
        return;
    }

    const amount = parseInt(rawAmt, 10);
    if (isNaN(amount) || amount <= 0) {
        errorEl.textContent = 'Nominal harus lebih dari 0.';
        return;
    }

    errorEl.textContent = '';

    transactions.push({
        id:       Date.now(),
        name:     itemName,
        amount:   amount,
        category: category,
        type:     currentType,          // 'expense' | 'income'
        date:     new Date().toISOString()
    });

    saveTransactions();
    populateMonthFilter();
    updateUI();

    // Reset form fields
    document.getElementById('itemName').value      = '';
    document.getElementById('amountDisplay').value = '';
    document.getElementById('amountHidden').value  = '';
    document.getElementById('category').value      = '';
}

// ============================================================
// DELETE TRANSACTION
// ============================================================
function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    populateMonthFilter();
    updateUI();
}

// ============================================================
// PERIOD FILTER
// ============================================================

// Returns midnight of today (local time) as a Date
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// Returns the Monday of the current week (local time)
function startOfThisWeek() {
    const d = startOfToday();
    const day = d.getDay();                    // 0 = Sun
    const diff = (day === 0) ? -6 : 1 - day;  // shift to Monday
    d.setDate(d.getDate() + diff);
    return d;
}

// Returns the 1st of the current month (local time)
function startOfThisMonth() {
    const d = startOfToday();
    d.setDate(1);
    return d;
}

function getMonthKey(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function getPeriodLabel() {
    if (filterPeriod === 'all')   return '';
    if (filterPeriod === 'today') return 'Hari Ini';
    if (filterPeriod === 'week')  return 'Minggu Ini';
    if (filterPeriod === 'month') return 'Bulan Ini';
    return getMonthLabel(filterPeriod);
}

// Show or hide the month picker sub-control
function showMonthPicker(visible) {
    const group = document.getElementById('monthPickerGroup');
    if (visible) {
        group.classList.remove('hidden');
    } else {
        group.classList.add('hidden');
        document.getElementById('monthFilter').value = '';
    }
}

function populateMonthFilter() {
    const select  = document.getElementById('monthFilter');
    const current = select.value;

    const months = [...new Set(transactions.map(t => getMonthKey(t.date)))].sort().reverse();

    select.innerHTML = '<option value="">pilih bulan</option>';
    months.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = getMonthLabel(key);
        select.appendChild(opt);
    });

    // Restore if still valid
    if (current && months.includes(current)) {
        select.value = current;
    }
}

// Called whenever a filter changes — updates all views
function applyFilters() {
    updateBalance();
    updateTransactionList();
    updateChart();
    updateCategoryBreakdown();
}

function getFilteredByPeriod(list) {
    if (filterPeriod === 'all') return list;

    if (filterPeriod === 'today') {
        const start = startOfToday();
        const end   = new Date(start.getTime() + 86400000); // +1 day
        return list.filter(t => {
            const d = new Date(t.date);
            return d >= start && d < end;
        });
    }

    if (filterPeriod === 'week') {
        const start = startOfThisWeek();
        const end   = new Date(start.getTime() + 7 * 86400000);
        return list.filter(t => {
            const d = new Date(t.date);
            return d >= start && d < end;
        });
    }

    if (filterPeriod === 'month') {
        const start = startOfThisMonth();
        const next  = new Date(start);
        next.setMonth(next.getMonth() + 1);
        return list.filter(t => {
            const d = new Date(t.date);
            return d >= start && d < next;
        });
    }

    // Specific month key e.g. '2025-05'
    return list.filter(t => getMonthKey(t.date) === filterPeriod);
}

// ============================================================
// UI UPDATE
// ============================================================
function updateUI() {
    updateBalance();
    updateTransactionList();
    updateChart();
    updateCategoryBreakdown();
}

// ============================================================
// BALANCE
// ============================================================
function updateBalance() {
    const scoped = getFilteredByPeriod(transactions);

    const income  = scoped.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = scoped.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net     = income - expense;

    document.getElementById('totalIncome').textContent  = formatRupiah(income);
    document.getElementById('totalExpense').textContent = formatRupiah(expense);

    const netEl = document.getElementById('totalBalance');
    netEl.textContent = formatRupiah(Math.abs(net));
    netEl.classList.toggle('negative', net < 0);
    if (net < 0) netEl.textContent = '−' + formatRupiah(Math.abs(net));

    const count = scoped.length;
    document.getElementById('transactionCount').textContent =
        count === 0 ? '0 transaksi' : `${count} transaksi`;

    const periodEl = document.getElementById('balancePeriod');
    periodEl.textContent = getPeriodLabel();
}

// ============================================================
// TRANSACTION LIST
// ============================================================
function getFilteredTransactions() {
    let list = getFilteredByPeriod(transactions);
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    return list;
}

function getSortedTransactions() {
    const list = getFilteredTransactions();
    switch (currentSort) {
        case 'date-desc':     return list.sort((a, b) => new Date(b.date) - new Date(a.date));
        case 'date-asc':      return list.sort((a, b) => new Date(a.date) - new Date(b.date));
        case 'amount-desc':   return list.sort((a, b) => b.amount - a.amount);
        case 'amount-asc':    return list.sort((a, b) => a.amount - b.amount);
        case 'category-asc':  return list.sort((a, b) => a.category.localeCompare(b.category));
        case 'category-desc': return list.sort((a, b) => b.category.localeCompare(a.category));
        default: return list;
    }
}

function updateTransactionList() {
    const container = document.getElementById('transactionList');
    const countEl   = document.getElementById('listCount');
    const sorted    = getSortedTransactions();

    if (sorted.length === 0) {
        countEl.textContent = '';
        container.innerHTML = `
            <div class="empty-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <p>Belum ada transaksi</p>
                <span>Tambahkan transaksi pertama kamu</span>
            </div>`;
        return;
    }

    countEl.textContent = `${sorted.length} item`;

    container.innerHTML = sorted.map(t => {
        const color      = getCategoryColor(t.category);
        const isIncome   = t.type === 'income';
        const amtClass   = isIncome ? 'income' : 'expense';
        const amtPrefix  = isIncome ? '+' : '−';
        const barColor   = isIncome ? 'var(--income-color)' : 'var(--expense-color)';

        return `
        <div class="transaction-item">
            <div class="transaction-type-indicator" style="background:${barColor}"></div>
            <div class="transaction-color-dot" style="background:${color}"></div>
            <div class="transaction-info">
                <div class="transaction-name">${escapeHtml(t.name)}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${escapeHtml(t.category)}</span>
                    <span class="transaction-date">${formatDate(t.date)}</span>
                </div>
            </div>
            <span class="transaction-amount ${amtClass}">${amtPrefix}${formatRupiah(t.amount)}</span>
            <button class="btn-delete" onclick="deleteTransaction(${t.id})" title="Hapus">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>`;
    }).join('');
}

// ============================================================
// CHART — only expense transactions
// ============================================================
function updateChart() {
    const canvas = document.getElementById('spendingChart');
    const noData = document.getElementById('noDataMessage');
    const wrap   = document.getElementById('chartWrap');

    const scoped   = getFilteredByPeriod(transactions).filter(t => t.type === 'expense');

    if (scoped.length === 0) {
        if (chart) { chart.destroy(); chart = null; }
        wrap.style.display = 'none';
        noData.classList.add('show');
        return;
    }

    wrap.style.display = 'block';
    noData.classList.remove('show');

    const totals = {};
    scoped.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

    const labels = Object.keys(totals);
    const data   = Object.values(totals);
    const colors = labels.map(cat => getCategoryColor(cat));

    const isDark      = document.documentElement.getAttribute('data-theme') === 'dark';
    const legendColor = isDark ? '#98989d' : '#6e6e73';
    const borderColor = isDark ? '#1c1c1e' : '#ffffff';

    if (chart) {
        chart.data.labels                        = labels;
        chart.data.datasets[0].data              = data;
        chart.data.datasets[0].backgroundColor   = colors;
        chart.data.datasets[0].borderColor        = borderColor;
        chart.options.plugins.legend.labels.color = legendColor;
        chart.update();
    } else {
        chart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 14,
                            color: legendColor,
                            font: { size: 12, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const val   = ctx.parsed;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct   = ((val / total) * 100).toFixed(1);
                                return `  ${ctx.label}: ${formatRupiah(val)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ============================================================
// CATEGORY BREAKDOWN (SIDEBAR) — scoped to month
// ============================================================
function updateCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    const scoped    = getFilteredByPeriod(transactions).filter(t => t.type === 'expense');

    if (scoped.length === 0) {
        container.innerHTML = '<p class="empty-hint">Belum ada data</p>';
        return;
    }

    const totals = {};
    scoped.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

    container.innerHTML = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `
            <div class="category-row">
                <div class="category-dot" style="background:${getCategoryColor(cat)}"></div>
                <span class="category-row-name">${escapeHtml(cat)}</span>
                <span class="category-row-amount">${formatRupiah(amt)}</span>
            </div>
        `).join('');
}

// ============================================================
// HELPERS
// ============================================================
function formatRupiah(amount) {
    return 'Rp\u00a0' + Math.round(amount).toLocaleString('id-ID');
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ============================================================
// START
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
