// bookshelf - localStorage backed
const KEY = 'bookshelf.v1';

let books = load();
let currentTab = 'reading';

const list = document.getElementById('list');
const modal = document.getElementById('modal');
const form = document.getElementById('bookForm');

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
  document.getElementById('totalRead').textContent = finished.length;
  document.getElementById('avgRating').textContent = avgRating(finished).toFixed(1);
  const pace = computePace(finished);
  document.getElementById('paceVal').textContent = pace ? pace.toFixed(1) : '--';
  document.getElementById('thisYear').textContent = booksThisYear();
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
    <button class="del" data-del="${b.id}">x</button>
    <div class="t">${escape(b.title)}</div>
    <div class="a">${escape(b.author)}</div>
    <div class="meta">${metaBits.join(' • ')} ${ratingHtml}</div>
    ${b.notes ? `<div class="notes">${escape(b.notes)}</div>` : ''}
  `;
  return div;
}

function render() {
  renderStats();
  const filtered = books.filter(b => b.status === currentTab);
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

document.getElementById('addBtn').addEventListener('click', () => {
  form.reset();
  modal.hidden = false;
});

document.getElementById('cancel').addEventListener('click', () => {
  modal.hidden = true;
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.rating = Number(data.rating) || 0;
  data.year = data.year ? Number(data.year) : null;
  // small convenience: a finished date implies status read
  if (data.finished && data.status !== 'read') data.status = 'read';
  books.push({ id: uid(), added: Date.now(), ...data });
  save();
  modal.hidden = true;
  render();
});

list.addEventListener('click', e => {
  const id = e.target.dataset.del;
  if (id && confirm('delete this one?')) {
    books = books.filter(b => b.id !== id);
    save();
    render();
  }
});

render();
