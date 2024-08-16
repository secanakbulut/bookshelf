// bookshelf - localStorage backed
const KEY = 'bookshelf.v1';

let books = load();
let currentTab = 'reading';
let editingId = null;

const $ = s => document.querySelector(s);
const list = $('#list');
const search = $('#search');
const sortSel = $('#sort');
const modal = $('#modal');
const form = $('#bookForm');

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    return [];
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(books));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function escape(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// pace = total span in days / number of finished books
// uses earliest and latest finished date in the dataset
function computePace(finishedBooks) {
  const dates = finishedBooks
    .map(b => b.finished)
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .sort((a, b) => a - b);
  if (dates.length < 2) return null;
  const span = (dates[dates.length - 1] - dates[0]) / 86400000;
  if (span <= 0) return null;
  return span / dates.length;
}

function avgRating(finishedBooks) {
  const rated = finishedBooks.filter(b => b.rating > 0);
  if (!rated.length) return 0;
  const sum = rated.reduce((s, b) => s + Number(b.rating), 0);
  return sum / rated.length;
}

function booksThisYear() {
  const y = new Date().getFullYear();
  return books.filter(b => b.finished && new Date(b.finished).getFullYear() === y).length;
}

function renderStats() {
  const finished = books.filter(b => b.status === 'read');
  $('#totalRead').textContent = finished.length;
  $('#avgRating').textContent = avgRating(finished).toFixed(1);
  const pace = computePace(finished);
  $('#paceVal').textContent = pace ? pace.toFixed(1) : '--';
  $('#thisYear').textContent = booksThisYear();
}

function stars(n) {
  n = Number(n) || 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function bookEl(b) {
  const div = document.createElement('div');
  div.className = 'book';
  let metaBits = [];
  if (b.year) metaBits.push(b.year);
  if (b.status === 'reading' && b.started) metaBits.push('started ' + fmtDate(b.started));
  if (b.status === 'read' && b.finished) metaBits.push('finished ' + fmtDate(b.finished));

  const ratingHtml = (b.status === 'read' && b.rating > 0)
    ? `<span class="stars">${stars(b.rating)}</span>` : '';

  div.innerHTML = `
    <div class="actions">
      <button data-edit="${b.id}">edit</button>
      <button data-del="${b.id}">x</button>
    </div>
    <div class="t">${escape(b.title)}</div>
    <div class="a">${escape(b.author)}</div>
    <div class="meta">${metaBits.join(' • ')} ${ratingHtml}</div>
    ${b.notes ? `<div class="notes">${escape(b.notes)}</div>` : ''}
  `;
  return div;
}

function render() {
  renderStats();
  const q = search.value.trim().toLowerCase();
  const sortBy = sortSel.value;

  let filtered = books.filter(b => b.status === currentTab);
  if (q) {
    filtered = filtered.filter(b =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'finished') return (b.finished || '').localeCompare(a.finished || '');
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return (b.added || 0) - (a.added || 0);
  });

  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">nothing here yet</div>`;
    return;
  }
  filtered.forEach(b => list.appendChild(bookEl(b)));
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentTab = t.dataset.tab;
    render();
  });
});

search.addEventListener('input', render);
sortSel.addEventListener('change', render);

$('#addBtn').addEventListener('click', () => openModal());
$('#cancel').addEventListener('click', closeModal);

function openModal(book) {
  editingId = book ? book.id : null;
  $('#formTitle').textContent = book ? 'edit book' : 'add a book';
  form.reset();
  if (book) {
    Object.entries(book).forEach(([k, v]) => {
      if (form.elements[k] != null) form.elements[k].value = v ?? '';
    });
  }
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  editingId = null;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.rating = Number(data.rating) || 0;
  data.year = data.year ? Number(data.year) : null;
  // small convenience: a finished date implies status read
  if (data.finished && data.status !== 'read') data.status = 'read';

  if (editingId) {
    const i = books.findIndex(b => b.id === editingId);
    if (i >= 0) books[i] = { ...books[i], ...data };
  } else {
    books.push({ id: uid(), added: Date.now(), ...data });
  }
  save();
  closeModal();
  render();
});

list.addEventListener('click', e => {
  const del = e.target.dataset.del;
  const ed = e.target.dataset.edit;
  if (del) {
    if (confirm('delete this one?')) {
      books = books.filter(b => b.id !== del);
      save();
      render();
    }
  }
  if (ed) {
    const b = books.find(x => x.id === ed);
    if (b) openModal(b);
  }
});

// TODO: maybe export to json one day
render();
