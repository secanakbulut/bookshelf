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

function bookEl(b) {
  const div = document.createElement('div');
  div.className = 'book';
  const meta = b.year ? b.year : '';
  div.innerHTML = `
    <button class="del" data-del="${b.id}">x</button>
    <div class="t">${escape(b.title)}</div>
    <div class="a">${escape(b.author)}</div>
    <div class="meta">${meta}</div>
    ${b.notes ? `<div class="notes">${escape(b.notes)}</div>` : ''}
  `;
  return div;
}

function render() {
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
  data.year = data.year ? Number(data.year) : null;
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
