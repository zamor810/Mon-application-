// ==========================================
// CashLife - Logique complète de l'application
// ==========================================

// 1. Récupération des éléments du DOM
const form = document.getElementById('transaction-form');
const typeButtons = document.querySelectorAll('.type-btn');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('categorie');
const dateInput = document.getElementById('date');

const currencySelect = document.getElementById('currency-select');
const amountCurrencyLabel = document.getElementById('amount-currency-label');
const exportCsvBtn = document.getElementById('export-csv-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');

const soldeTotalEl = document.getElementById('solde-total');
const savingsRateEl = document.getElementById('savings-rate');
const totalRevenusEl = document.getElementById('total-revenus');
const incomeCountEl = document.getElementById('income-count');
const totalDepensesEl = document.getElementById('total-depenses');
const expenseCountEl = document.getElementById('expense-count');

const searchInput = document.getElementById('search-input');
const typeFilterSelect = document.getElementById('type-filter');
const categoryFilterSelect = document.getElementById('category-filter');
const historyList = document.getElementById('history-list');

const categoryChartCanvas = document.getElementById('category-chart');
const comparisonChartCanvas = document.getElementById('comparison-chart');

// 2. État de l'application (sauvegardé dans LocalStorage)
let transactions = JSON.parse(localStorage.getItem('cashlife_transactions')) || [];
let currentCurrency = localStorage.getItem('cashlife_currency') || 'HTG';

let categoryChart = null;
let comparisonChart = null;

// Initialiser la date du jour par défaut (YYYY-MM-DD)
function setTodayDate() {
  if (!dateInput) return;
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
}

// Sauvegarder dans le navigateur
function saveTransactions() {
  localStorage.setItem('cashlife_transactions', JSON.stringify(transactions));
}

// Formater les montants avec séparateurs de milliers (ex: 37,700.00 HTG)
function formatMoney(value) {
  const num = parseFloat(value) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currentCurrency}`;
}

// Formater la date lisiblement (ex: 23 Nov 2026)
function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day} ${months[monthIndex] || parts[1]} ${year}`;
}

// Associer une icône à chaque catégorie
function getCategoryBadge(category) {
  const icons = {
    Nourriture: '🍲',
    Transport: '🚌',
    Loisirs: '🎉',
    Santé: '🏥',
    Business: '📈',
    Salaire: '💼',
    Autre: '📌',
  };
  const label = category || 'Autre';
  const icon = icons[label] || '📌';
  return `${icon} ${label}`;
}

// 3. Gestion des boutons toggle Dépense (-) / Revenu (+)
typeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    typeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    typeInput.value = btn.dataset.type;

    // Pré-sélectionner une catégorie cohérente
    if (btn.dataset.type === 'revenu' && categoryInput.value === 'Nourriture') {
      categoryInput.value = 'Salaire';
    } else if (btn.dataset.type === 'depense' && categoryInput.value === 'Salaire') {
      categoryInput.value = 'Nourriture';
    }
  });
});

// 4. Changement de devise
if (currencySelect) {
  currencySelect.value = currentCurrency;
  if (amountCurrencyLabel) amountCurrencyLabel.textContent = currentCurrency;

  currencySelect.addEventListener('change', () => {
    currentCurrency = currencySelect.value;
    localStorage.setItem('cashlife_currency', currentCurrency);
    if (amountCurrencyLabel) amountCurrencyLabel.textContent = currentCurrency;
    renderAll();
  });
}

// 5. Mise à jour des cartes de synthèse
function updateSummary() {
  const revenusList = transactions.filter((t) => t.type === 'revenu');
  const depensesList = transactions.filter((t) => t.type === 'depense');

  const totalRevenus = revenusList.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalDepenses = depensesList.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const solde = totalRevenus - totalDepenses;

  const savingsRate =
    totalRevenus > 0 ? Math.max(0, Math.round((solde / totalRevenus) * 100)) : 0;

  soldeTotalEl.textContent = formatMoney(solde);
  savingsRateEl.textContent = `Taux d'épargne : ${savingsRate}% sur vos revenus`;

  totalRevenusEl.textContent = formatMoney(totalRevenus);
  incomeCountEl.textContent = `${revenusList.length} transaction${revenusList.length > 1 ? 's' : ''} revenu`;

  totalDepensesEl.textContent = formatMoney(totalDepenses);
  expenseCountEl.textContent = `${depensesList.length} transaction${depensesList.length > 1 ? 's' : ''} dépense`;

  updateCharts(totalRevenus, totalDepenses, depensesList);
}

// 6. Mise à jour des graphiques Chart.js
function updateCharts(totalRevenus, totalDepenses, depensesList) {
  if (typeof Chart === 'undefined') return;

  // Regrouper les dépenses par catégorie
  const categoryTotals = {};
  depensesList.forEach((t) => {
    const cat = t.category || 'Autre';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(t.amount) || 0);
  });

  const catLabels = Object.keys(categoryTotals);
  const catValues = Object.values(categoryTotals);
  const catColors = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#64748b'];

  if (categoryChartCanvas) {
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryChartCanvas, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['Aucune dépense'],
        datasets: [
          {
            data: catValues.length ? catValues : [1],
            backgroundColor: catValues.length ? catColors.slice(0, catLabels.length) : ['#e5e7eb'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 14 },
          },
        },
      },
    });
  }

  if (comparisonChartCanvas) {
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(comparisonChartCanvas, {
      type: 'bar',
      data: {
        labels: ['Total Revenus (+)', 'Total Dépenses (-)'],
        datasets: [
          {
            data: [totalRevenus, totalDepenses],
            backgroundColor: ['#059669', '#e11d48'],
            borderRadius: 10,
            barThickness: 52,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
  }
}

// 7. Affichage du tableau d'historique filtré
function renderTable() {
  const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const selectedType = typeFilterSelect ? typeFilterSelect.value : 'all';
  const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : 'all';

  const filtered = transactions
    .filter((t) => {
      const matchesSearch = (t.description || '').toLowerCase().includes(query);
      const matchesType = selectedType === 'all' || t.type === selectedType;
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);

  historyList.innerHTML = '';

  if (filtered.length === 0) {
    historyList.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          Aucune transaction trouvée. Ajoutez-en une ou cliquez sur « Données d'exemple ».
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((t) => {
    const isIncome = t.type === 'revenu';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const typeBadge = isIncome
      ? '<span class="badge badge-income">↙ Revenu</span>'
      : '<span class="badge badge-expense">↗ Dépense</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDisplayDate(t.date)}</td>
      <td><strong>${t.description}</strong></td>
      <td><span class="badge badge-category">${getCategoryBadge(t.category)}</span></td>
      <td>${typeBadge}</td>
      <td class="amount-cell ${amountClass}">${sign} ${formatMoney(t.amount)}</td>
      <td>
        <button type="button" class="delete-row-btn" data-id="${t.id}" title="Supprimer">
          🗑
        </button>
      </td>
    `;
    historyList.appendChild(tr);
  });
}

function renderAll() {
  updateSummary();
  renderTable();
}

// 8. Ajout d'une transaction
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value || 'depense';
    const category = categoryInput.value || 'Autre';
    const date = dateInput.value || new Date().toISOString().split('T')[0];

    if (!description || isNaN(amount) || amount <= 0) {
      return;
    }

    const newTransaction = {
      id: Date.now(),
      description,
      amount,
      type,
      category,
      date,
    };

    transactions.unshift(newTransaction);
    saveTransactions();
    renderAll();

    descriptionInput.value = '';
    amountInput.value = '';
    setTodayDate();
  });
}

// 9. Suppression d'une ligne
if (historyList) {
  historyList.addEventListener('click', (event) => {
    const btn = event.target.closest('.delete-row-btn');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    transactions = transactions.filter((t) => Number(t.id) !== id);
    saveTransactions();
    renderAll();
  });
}

// 10. Recherche et filtres en direct
if (searchInput) searchInput.addEventListener('input', renderTable);
if (typeFilterSelect) typeFilterSelect.addEventListener('change', renderTable);
if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', renderTable);

// 11. Tout effacer
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    if (transactions.length === 0) return;
    if (confirm('Voulez-vous vraiment supprimer toutes vos transactions ?')) {
      transactions = [];
      saveTransactions();
      renderAll();
    }
  });
}

// 12. Exporter CSV
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', () => {
    if (transactions.length === 0) {
      alert('Aucune transaction à exporter.');
      return;
    }

    const headers = ['Date', 'Description', 'Catégorie', 'Type', 'Montant', 'Devise'];
    const rows = transactions.map((t) => [
      t.date || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category || '',
      t.type === 'revenu' ? 'Revenu' : 'Dépense',
      t.amount,
      currentCurrency,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashlife_budget_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// 13. Charger des données d'exemple
if (loadSampleBtn) {
  loadSampleBtn.addEventListener('click', () => {
    transactions = [
      { id: 1, date: '2026-11-23', description: 'Salaire mensuel', category: 'Salaire', type: 'revenu', amount: 45000 },
      { id: 2, date: '2026-11-22', description: 'Sortie avec amis le week-end', category: 'Loisirs', type: 'depense', amount: 3000 },
      { id: 3, date: '2026-11-21', description: 'Achat médicaments pharmacie', category: 'Santé', type: 'depense', amount: 1800 },
      { id: 4, date: '2026-11-20', description: 'Transport et carburant', category: 'Transport', type: 'depense', amount: 2300 },
      { id: 5, date: '2026-11-19', description: 'Vente service freelance', category: 'Business', type: 'revenu', amount: 12500 },
      { id: 6, date: '2026-11-18', description: 'Courses supermarché', category: 'Nourriture', type: 'depense', amount: 12700 },
    ];
    saveTransactions();
    renderAll();
  });
}

// Démarrage initial
setTodayDate();
renderAll();

