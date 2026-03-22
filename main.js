import { buildProject } from './generators/project-builder.js';

const DS_LIST = [
  { id: 'dictionary',    name: 'Dictionary',    complexity: 'get/set: O(1)',           description: 'キーで値を管理するマップ',            color: '#4A90E2' },
  { id: 'hashset',       name: 'HashSet',       complexity: 'contains: O(1)',          description: '重複なし集合、存在確認が速い',         color: '#7ED321' },
  { id: 'priority_queue',name: 'Priority Queue',complexity: 'push/pop-min: O(log n)',  description: '常に最小値を素早く取り出す',           color: '#F5A623' },
  { id: 'deque',         name: 'Deque',         complexity: 'push/pop both ends: O(1)',description: '両端キュー',                         color: '#9B59B6' },
  { id: 'union_find',    name: 'Union-Find',    complexity: 'find/union: O(α n) ≈ O(1)',description: '連結成分の管理',                    color: '#E74C3C' },
  { id: 'trie',          name: 'Trie',          complexity: 'search: O(m)',            description: '前方一致・文字列検索',                color: '#1ABC9C' },
  { id: 'segment_tree',  name: 'Segment Tree',  complexity: 'query/update: O(log n)',  description: '区間クエリの高速処理',                color: '#E67E22' },
  { id: 'lru_cache',     name: 'LRU Cache',     complexity: 'get/put: O(1)',           description: '最近最も使われないものを自動削除',     color: '#2ECC71' },
  { id: 'bloom_filter',  name: 'Bloom Filter',  complexity: 'contains: O(k) ≈ O(1)',  description: '確率的存在確認（超高速）',             color: '#3498DB' },
];

const counters = {};
let entries = [];

function renderCards() {
  const grid = document.getElementById('ds-grid');
  grid.innerHTML = '';
  DS_LIST.forEach(ds => {
    const card = document.createElement('div');
    card.className = 'ds-card';
    card.style.setProperty('--accent', ds.color);
    card.innerHTML = `
      <div class="card-accent"></div>
      <div class="card-body">
        <div class="card-name">${ds.name}</div>
        <div class="card-complexity">${ds.complexity}</div>
        <div class="card-desc">${ds.description}</div>
      </div>
    `;
    card.addEventListener('click', () => addEntry(ds));
    grid.appendChild(card);
  });
}

function addEntry(ds) {
  if (!counters[ds.id]) counters[ds.id] = 0;
  counters[ds.id]++;
  const spriteName = ds.name.replace(/[^a-zA-Z0-9]/g, '') + counters[ds.id];
  entries.push({ spriteName, dsId: ds.id, dsName: ds.name, color: ds.color });
  renderEntries();
}

function removeEntry(index) {
  entries.splice(index, 1);
  renderEntries();
}

function renderEntries() {
  const list = document.getElementById('entry-list');
  const empty = document.getElementById('entry-empty');
  const genBtn = document.getElementById('gen-btn');

  if (entries.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    genBtn.disabled = true;
    return;
  }

  empty.style.display = 'none';
  genBtn.disabled = false;
  list.innerHTML = '';

  entries.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'entry-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'entry-name';
    input.value = entry.spriteName;
    input.dataset.index = String(i);

    const badge = document.createElement('span');
    badge.className = 'entry-badge';
    badge.style.background = entry.color;
    badge.textContent = entry.dsName;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'entry-delete';
    deleteBtn.dataset.index = String(i);
    deleteBtn.title = '削除';
    deleteBtn.textContent = '✕';

    row.appendChild(input);
    row.appendChild(badge);
    row.appendChild(deleteBtn);
    list.appendChild(row);
  });

  list.querySelectorAll('.entry-name').forEach(input => {
    input.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.index);
      entries[idx].spriteName = e.target.value.trim() || entries[idx].spriteName;
    });
  });

  list.querySelectorAll('.entry-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      removeEntry(parseInt(e.target.dataset.index));
    });
  });
}

async function generate() {
  const btn = document.getElementById('gen-btn');
  btn.disabled = true;
  btn.textContent = '生成中...';

  try {
    const { projectJson, costumes } = buildProject(entries);

    const zip = new JSZip();

    const stageSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="white"/></svg>';
    zip.file('cd21514d0531fdffb22204e0ec5ed84a.svg', stageSvg);

    const seen = new Set();
    for (const { filename, svgString } of costumes) {
      if (!seen.has(filename)) {
        zip.file(filename, svgString);
        seen.add(filename);
      }
    }

    zip.file('project.json', JSON.stringify(projectJson));

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'scratch_ds.sb3');
  } catch (err) {
    console.error('Generation error:', err);
    alert('エラーが発生しました: ' + err.message);
  } finally {
    btn.disabled = entries.length === 0;
    btn.textContent = '▶ .sb3 を生成してダウンロード';
  }
}

document.getElementById('gen-btn').addEventListener('click', generate);

renderCards();
renderEntries();
