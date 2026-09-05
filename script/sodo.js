/**
 * C7AIO Sơ Đồ Lớp v2 — Full Seating Chart System
 * Tabs: Trong Lớp | Theo Môn | Ngoài Sân | Tùy Chỉnh
 * Seat types: double | single | chair | standing
 * Cell types: student | anyone (bất kỳ) | extra | empty
 */

// ============= CONSTANTS =============
const SODO_SUBJECT_LIST = [
  { key:'toan',   label:'Toán',          icon:'📐', color:'#3b82f6' },
  { key:'van',    label:'Ngữ Văn',       icon:'📖', color:'#ec4899' },
  { key:'anh',    label:'Tiếng Anh',     icon:'🌍', color:'#8b5cf6' },
  { key:'ly',     label:'Vật Lí',        icon:'⚡', color:'#06b6d4' },
  { key:'hoa',    label:'Hóa Học',       icon:'🧪', color:'#10b981' },
  { key:'sinh',   label:'Sinh Học',      icon:'🌿', color:'#84cc16' },
  { key:'su',     label:'Lịch Sử',       icon:'📜', color:'#f59e0b' },
  { key:'dia',    label:'Địa Lí',        icon:'🗺️', color:'#d97706' },
  { key:'tin',    label:'Tin Học',        icon:'💻', color:'#6366f1' },
  { key:'theduc', label:'Thể Dục',       icon:'🏃', color:'#ef4444' },
  { key:'gdcd',   label:'GDCD / KT&PL',  icon:'⚖️', color:'#14b8a6' },
];

const SODO_OUTDOOR_LIST = [
  { key:'gdtc',   label:'GDTC / Thể Dục',      icon:'🏃', color:'#ef4444', seatType:'standing', defaultRows:10, defaultCols:4,
    frontLabel:'🏃 &nbsp;HƯỚNG TẬP &nbsp;—&nbsp; PHÍA TRƯỚC &nbsp;🏃',
    desc:'Đội hình đứng tập thể dục, GDTC ngoài sân trường' },
  { key:'qpan',   label:'QPAN / Quốc Phòng',    icon:'🪖', color:'#78716c', seatType:'standing', defaultRows:10, defaultCols:4,
    frontLabel:'🪖 &nbsp;HƯỚNG NHÌN &nbsp;—&nbsp; CHỈ HUY ĐỨNG ĐÂY &nbsp;🪖',
    desc:'Đội hình quân sự, giáo dục quốc phòng an ninh' },
  { key:'chaoco', label:'Chào Cờ',               icon:'🚩', color:'#dc2626', seatType:'chair',    defaultRows:7,  defaultCols:6,
    frontLabel:'🚩 &nbsp;CỘT CỜ &nbsp;—&nbsp; PHÍA TRƯỚC &nbsp;🚩',
    desc:'Sơ đồ ghế nhựa hàng ngang, chào cờ đầu tuần' },
  { key:'hdnt',   label:'Hoạt Động Ngoài Trời',  icon:'🌳', color:'#16a34a', seatType:'chair',    defaultRows:6,  defaultCols:6,
    frontLabel:'🌳 &nbsp;SÂN KHẤU / PHÍA TRƯỚC &nbsp;🌳',
    desc:'Hội trường, sự kiện ngoài trời, hoạt động tập thể' },
];

const SODO_SEAT_TYPE_LIST = [
  { key:'double',   label:'Bàn Đôi',       icon:'▣', desc:'Bàn 2 người, trong lớp học' },
  { key:'quad',     label:'Bàn 4 (2x2)',   icon:'⊞', desc:'Bàn nhóm 4 người, hình vuông' },
  { key:'quad_h',   label:'Bàn 4 Ngang',   icon:'⊟', desc:'Bàn 4 người, xếp ngang 1x4' },
  { key:'quad_v',   label:'Bàn 4 Dọc',     icon:'⏣', desc:'Bàn 4 người, xếp dọc 4x1' },
  { key:'single',   label:'Bàn Đơn',       icon:'◻', desc:'Bàn 1 người, trong lớp học' },
  { key:'chair',    label:'Ghế Nhựa',      icon:'🪑', desc:'Ghế nhựa không bàn, ngoài trời / hội trường' },
  { key:'standing', label:'Vị Trí Đứng',  icon:'🧍', desc:'Vị trí đứng, thể dục / quốc phòng' },
];

const SODO_ICONS = ['🪑','🏟️','🏫','📐','🏃','🪖','🚩','🌳','🎭','📋','🎓','🌟','⭐','🎯','🏆'];

const SODO_DEFAULT_ROWS = 7;
const SODO_DEFAULT_COLS = 6;

// ============= STATE =============
let sodoData = { default:null, subjects:{}, outdoor:{}, outdoor_custom:{}, custom:{} };
let sodoActiveTab = 'tronglop';    // 'tronglop'|'subject'|'ngoaisan'|'tuychinh'
let sodoActiveSubject = 'toan';
let sodoActiveOutdoor = 'gdtc';
let sodoOutdoorSubTab = 'preset';  // 'preset'|'custom'

// Editor state
let editorMode = null;
let editorChartId = null;
let editorLayout = [];
let editorRows = SODO_DEFAULT_ROWS;
let editorCols = SODO_DEFAULT_COLS;
let editorExtraPeople = [];
let editorUndoStack = [];
let editorRedoStack = [];
let editorDefaultSeatType = 'double';
let editorAnyoneCounter = 0;
let editorPickedIcon = '🪑';

// Drag state
let dragStudentId = null;
let dragIsAnyone  = false;
let dragFromCell  = null;

// Context/selection
let ctxRow = null, ctxCol = null;
let editorSelectedCell = null;
let extraIdSeed = 90000;

// ============= FIREBASE =============
function sodoLoadFromFirebase() {
  const db = getDb();
  if (!db) { sodoLoadFromCache(); return; }
  db.ref('shared/seating').on('value', snap => {
    const v = snap.val() || {};
    sodoData = {
      default:       v.default        || null,
      subjects:      v.subjects       || {},
      outdoor:       v.outdoor        || {},
      outdoor_custom:v.outdoor_custom || {},
      custom:        v.custom         || {}
    };
    localStorage.setItem('c7aio_seating_cache', JSON.stringify(sodoData));
    sodoRenderActiveTab();
  });
}

function sodoLoadFromCache() {
  try {
    const c = JSON.parse(localStorage.getItem('c7aio_seating_cache') || '{}');
    sodoData = {
      default:       c.default        || null,
      subjects:      c.subjects       || {},
      outdoor:       c.outdoor        || {},
      outdoor_custom:c.outdoor_custom || {},
      custom:        c.custom         || {}
    };
  } catch { sodoData = { default:null, subjects:{}, outdoor:{}, outdoor_custom:{}, custom:{} }; }
  sodoRenderActiveTab();
}

async function sodoSave(path, data) {
  localStorage.setItem('c7aio_seating_cache', JSON.stringify(sodoData));
  const db = getDb();
  if (!db) { showToast('⚠️ Offline — Đã lưu cục bộ', 'warning'); return; }
  try {
    await db.ref(`shared/seating/${path}`).set(data);
    showToast('✅ Đã lưu sơ đồ', 'success');
  } catch (e) { showToast('❌ Lỗi lưu: ' + e.message, 'error'); }
}

async function sodoRemove(path) {
  const db = getDb();
  if (db) await db.ref(`shared/seating/${path}`).remove();
}

// ============= TAB SWITCHING =============
function switchTab(tab) {
  sodoActiveTab = tab;
  sodoRenderActiveTab();
}

function sodoRenderActiveTab() {
  document.querySelectorAll('.sodo-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === sodoActiveTab));
  document.querySelectorAll('.sodo-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === sodoActiveTab));
  if      (sodoActiveTab === 'tronglop')  renderInClassTab();
  else if (sodoActiveTab === 'subject')   renderSubjectTab();
  else if (sodoActiveTab === 'ngoaisan')  renderOutdoorTab();
  else                                    renderCustomTab();
}

// ============= TAB: TRONG LỚP =============
function renderInClassTab() {
  const panel = document.getElementById('panel-tronglop');
  if (!panel) return;
  const canEdit = checkPermission('manage_seating');
  const d = sodoData.default;
  panel.innerHTML = `
    <div class="sodo-panel-header">
      <div class="sodo-panel-info">
        <h3>🏫 Sơ Đồ Lớp Hiện Tại</h3>
        <p class="sodo-meta">${d ? `Cập nhật ${sodoRelTime(d.updatedAt)}${d.updatedBy ? ' · ' + d.updatedBy : ''}` : 'Chưa có sơ đồ — người có quyền có thể tạo sơ đồ'}</p>
      </div>
      ${canEdit ? `<button class="sodo-btn sodo-btn-primary" onclick="openEditor('default')">✏️ Chỉnh Sửa</button>` : ''}
    </div>
    <div id="sodo-default-grid" class="sodo-grid-container"></div>
    ${d ? sodoLegendHTML() : ''}`;
  renderSeatingGrid('sodo-default-grid', d ? d.layout : null);
}

function sodoLegendHTML() {
  return `<div class="sodo-legend">
    <span class="sodo-legend-item"><span class="sodo-legend-dot" style="background:var(--primary)"></span>Học sinh</span>
    <span class="sodo-legend-item"><span class="sodo-legend-dot sodo-dot-empty"></span>Ghế trống</span>
    <span class="sodo-legend-item"><span class="sodo-legend-dot sodo-dot-anyone"></span>Bất Kỳ</span>
    <span class="sodo-legend-item"><b>▣</b> Bàn đôi &nbsp; <b>⊞</b> Bàn 4 &nbsp; <b>◻</b> Bàn đơn &nbsp; <b>🪑</b> Ghế nhựa &nbsp; <b>🧍</b> Đứng</span>
  </div>`;
}

// ============= TAB: THEO MÔN =============
function renderSubjectTab() {
  const panel = document.getElementById('panel-subject');
  if (!panel) return;
  panel.innerHTML = `
    <div class="sodo-subject-selector">
      ${SODO_SUBJECT_LIST.map(s => `
        <button class="sodo-subject-btn ${sodoActiveSubject === s.key ? 'active' : ''}"
          style="--subj-color:${s.color}" onclick="selectSubject('${s.key}')">
          <span>${s.icon}</span><span>${s.label}</span>
        </button>`).join('')}
    </div>
    <div id="sodo-subject-content"></div>`;
  renderSubjectContent();
}

function selectSubject(key) {
  sodoActiveSubject = key;
  document.querySelectorAll('.sodo-subject-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${key}'`)));
  renderSubjectContent();
}

function renderSubjectContent() {
  const canEdit = checkPermission('manage_seating');
  const s = SODO_SUBJECT_LIST.find(x => x.key === sodoActiveSubject);
  const sd = sodoData.subjects[sodoActiveSubject] || null;
  const layout = sd?.layout || sodoData.default?.layout || null;
  const container = document.getElementById('sodo-subject-content');
  if (!container) return;
  container.innerHTML = `
    <div class="sodo-panel-header">
      <div class="sodo-panel-info">
        <h3>${s.icon} Sơ Đồ Môn ${s.label}</h3>
        <p class="sodo-meta">${sd ? `Cập nhật ${sodoRelTime(sd.updatedAt)}` : 'Chưa có sơ đồ riêng — hiển thị sơ đồ lớp hiện tại'}</p>
      </div>
      ${canEdit ? `<button class="sodo-btn sodo-btn-primary" style="background:${s.color};box-shadow:0 2px 8px ${s.color}55"
        onclick="openEditor('subject','${sodoActiveSubject}')">✏️ Chỉnh Sửa</button>` : ''}
    </div>
    <div id="sodo-subject-grid" class="sodo-grid-container"></div>`;
  renderSeatingGrid('sodo-subject-grid', layout);
}

// ============= TAB: NGOÀI SÂN =============
function renderOutdoorTab() {
  const panel = document.getElementById('panel-ngoaisan');
  if (!panel) return;
  panel.innerHTML = `
    <div class="sodo-outdoor-tabs">
      <button class="sodo-outdoor-tab-btn ${sodoOutdoorSubTab==='preset'?'active':''}" onclick="switchOutdoorSubTab('preset')">🎯 Sơ Đồ Mặc Định</button>
      <button class="sodo-outdoor-tab-btn ${sodoOutdoorSubTab==='custom'?'active':''}" onclick="switchOutdoorSubTab('custom')">✏️ Sơ Đồ Tùy Chỉnh</button>
    </div>
    <div id="sodo-outdoor-content"></div>`;
  renderOutdoorContent();
}

function switchOutdoorSubTab(sub) {
  sodoOutdoorSubTab = sub;
  document.querySelectorAll('.sodo-outdoor-tab-btn').forEach((b, i) => b.classList.toggle('active', (i===0 && sub==='preset') || (i===1 && sub==='custom')));
  renderOutdoorContent();
}

function renderOutdoorContent() {
  const c = document.getElementById('sodo-outdoor-content');
  if (!c) return;
  if (sodoOutdoorSubTab === 'preset') renderOutdoorPresets(c);
  else renderOutdoorCustom(c);
}

function renderOutdoorPresets(container) {
  container.innerHTML = `
    <div class="sodo-outdoor-scenario-selector">
      ${SODO_OUTDOOR_LIST.map(o => `
        <button class="sodo-outdoor-btn ${sodoActiveOutdoor===o.key?'active':''}"
          style="--outdoor-color:${o.color}" onclick="selectOutdoor('${o.key}')">
          <span class="sodo-outdoor-btn-icon">${o.icon}</span>
          <span class="sodo-outdoor-btn-label">${o.label}</span>
          <span class="sodo-outdoor-btn-desc">${o.desc}</span>
        </button>`).join('')}
    </div>
    <div id="sodo-outdoor-grid-content"></div>`;
  renderOutdoorPresetContent();
}

function selectOutdoor(key) {
  sodoActiveOutdoor = key;
  document.querySelectorAll('.sodo-outdoor-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick').includes(`'${key}'`)));
  renderOutdoorPresetContent();
}

function renderOutdoorPresetContent() {
  const canEdit = checkPermission('manage_seating');
  const o = SODO_OUTDOOR_LIST.find(x => x.key === sodoActiveOutdoor);
  const od = sodoData.outdoor[sodoActiveOutdoor] || null;
  const container = document.getElementById('sodo-outdoor-grid-content');
  if (!container) return;
  container.innerHTML = `
    <div class="sodo-panel-header">
      <div class="sodo-panel-info">
        <h3>${o.icon} ${o.label}</h3>
        <p class="sodo-meta">${od ? `Cập nhật ${sodoRelTime(od.updatedAt)}` : o.desc}</p>
      </div>
      ${canEdit ? `<button class="sodo-btn sodo-btn-primary" style="background:${o.color};box-shadow:0 2px 8px ${o.color}55"
        onclick="openEditor('outdoor','${sodoActiveOutdoor}')">✏️ Chỉnh Sửa</button>` : ''}
    </div>
    <div id="sodo-outdoor-grid" class="sodo-grid-container sodo-outdoor-grid-view"></div>`;
  renderSeatingGrid('sodo-outdoor-grid', od ? od.layout : null, { seatType: o.seatType, frontLabel: o.frontLabel });
}

function renderOutdoorCustom(container) {
  const user = getCurrentUser();
  const entries = Object.entries(sodoData.outdoor_custom || {});
  container.innerHTML = `
    <div class="sodo-panel-header">
      <div class="sodo-panel-info">
        <h3>✏️ Sơ Đồ Sân Trường Tùy Chỉnh</h3>
        <p class="sodo-meta">Tạo thêm sơ đồ riêng cho bất kỳ hoạt động ngoài sân nào</p>
      </div>
      <button class="sodo-btn sodo-btn-success" onclick="openEditor('outdoor_custom','__new__')">➕ Tạo Sơ Đồ Mới</button>
    </div>
    ${entries.length === 0
      ? `<div class="sodo-empty-state"><span class="sodo-empty-icon">🏟️</span><p>Chưa có sơ đồ ngoài sân tùy chỉnh.<br>Nhấn <b>Tạo Sơ Đồ Mới</b> để bắt đầu!</p></div>`
      : `<div class="sodo-custom-grid">${entries.map(([id,c]) => renderCustomCard(id,c,user,'outdoor_custom')).join('')}</div>`}`;
  entries.forEach(([id,chart]) => { if (chart.layout) renderMiniPreview(`mini-${id}`, chart.layout); });
}

// ============= TAB: TÙY CHỈNH =============
function renderCustomTab() {
  const panel = document.getElementById('panel-tuychinh');
  if (!panel) return;
  const user = getCurrentUser();
  const entries = Object.entries(sodoData.custom || {});
  panel.innerHTML = `
    <div class="sodo-panel-header">
      <div class="sodo-panel-info">
        <h3>🎨 Sơ Đồ Tùy Chỉnh</h3>
        <p class="sodo-meta">Tạo sơ đồ riêng với bất kỳ bố cục nào — sự kiện đặc biệt, người ngoài lớp...</p>
      </div>
      <button class="sodo-btn sodo-btn-success" onclick="openEditor('custom','__new__')">➕ Tạo Sơ Đồ Mới</button>
    </div>
    ${entries.length === 0
      ? `<div class="sodo-empty-state"><span class="sodo-empty-icon">🎨</span><p>Chưa có sơ đồ tùy chỉnh.<br>Nhấn <b>Tạo Sơ Đồ Mới</b> để bắt đầu!</p></div>`
      : `<div class="sodo-custom-grid">${entries.map(([id,c]) => renderCustomCard(id,c,user,'custom')).join('')}</div>`}`;
  entries.forEach(([id,chart]) => { if (chart.layout) renderMiniPreview(`mini-${id}`, chart.layout); });
}

function renderCustomCard(id, chart, user, col) {
  const canManage = isAdmin() || (user && chart.createdBy === user.name);
  return `
    <div class="sodo-custom-card" onclick="viewChart('${col}','${id}')">
      <div class="sodo-custom-card-header">
        <span class="sodo-custom-card-icon">${chart.icon || (col==='outdoor_custom'?'🏟️':'🪑')}</span>
        <div class="sodo-custom-card-info">
          <h4>${sodoEsc(chart.name||'Sơ đồ không tên')}</h4>
          <p>${sodoEsc(chart.createdBy||'Ẩn danh')} · ${sodoRelTime(chart.createdAt)}</p>
        </div>
      </div>
      <div class="sodo-custom-card-preview" id="mini-${id}"></div>
      ${canManage ? `
        <div class="sodo-custom-card-actions" onclick="event.stopPropagation()">
          <button class="sodo-btn-sm sodo-btn-primary" onclick="openEditor('${col}','${id}')">✏️ Sửa</button>
          <button class="sodo-btn-sm sodo-btn-danger"  onclick="deleteChart('${col}','${id}')">🗑️ Xóa</button>
        </div>` : ''}
    </div>`;
}

function renderMiniPreview(containerId, layout) {
  const el = document.getElementById(containerId);
  if (!el || !layout) return;
  const cols = Math.max(...layout.map(r => r.length));
  el.innerHTML = `<div class="sodo-mini-grid" style="--mini-cols:${cols}">
    ${layout.map(row => row.map(cell => {
      if (!cell || cell.empty) return `<div class="sodo-mini-cell sodo-mini-empty"></div>`;
      if (cell.type === 'anyone') return `<div class="sodo-mini-cell sodo-mini-anyone"></div>`;
      return `<div class="sodo-mini-cell" style="background:${getAvatarGradient(cell.label||'?')}"></div>`;
    }).join('')).join('')}
  </div>`;
}

// ============= VIEW CHART =============
function viewChart(col, id) {
  const chart = sodoData[col]?.[id];
  if (!chart) return;
  const user = getCurrentUser();
  const canEdit = isAdmin() || (user && chart.createdBy === user.name);
  openFullscreenView(chart.icon||'🪑', chart.name||'Sơ đồ', chart.layout, canEdit, () => openEditor(col, id));
}

function openFullscreenView(icon, title, layout, canEdit, onEdit) {
  const ov = document.getElementById('sodo-editor-overlay');
  if (!ov) return;
  ov.innerHTML = `
    <div class="sodo-fullscreen-view">
      <div class="sodo-editor-header">
        <div class="sodo-editor-title"><span>Xem</span><h3>${sodoEsc(icon)} ${sodoEsc(title)}</h3></div>
        <div class="sodo-editor-header-actions">
          ${canEdit ? `<button class="sodo-editor-btn sodo-editor-btn-save" onclick="closeOverlayAndEdit()">✏️ Chỉnh Sửa</button>` : ''}
          <button class="sodo-editor-btn sodo-editor-btn-close" onclick="closeSodoOverlay()">✕ Đóng</button>
        </div>
      </div>
      <div class="sodo-fullscreen-grid-container">
        <div id="fullscreen-sodo-grid" class="sodo-grid-container"></div>
      </div>
    </div>`;
  ov.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderSeatingGrid('fullscreen-sodo-grid', layout);
  window._sodoOverlayOnEdit = onEdit;
}

function closeOverlayAndEdit() { closeSodoOverlay(); if (window._sodoOverlayOnEdit) window._sodoOverlayOnEdit(); }
function closeSodoOverlay() {
  const ov = document.getElementById('sodo-editor-overlay');
  if (ov) { ov.classList.remove('active'); ov.innerHTML = ''; }
  document.body.style.overflow = '';
}

// ============= DELETE =============
async function deleteChart(col, id) {
  showConfirm('Xóa sơ đồ', 'Bạn có chắc muốn xóa sơ đồ này không?', async () => {
    delete sodoData[col][id];
    localStorage.setItem('c7aio_seating_cache', JSON.stringify(sodoData));
    await sodoRemove(`${col}/${id}`);
    sodoRenderActiveTab();
    showToast('🗑️ Đã xóa sơ đồ', 'success');
  });
}

// ============= RENDER SEATING GRID (VIEW) =============
function renderSeatingGrid(containerId, layout, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!layout || !layout.length) {
    el.innerHTML = `<div class="sodo-empty-state"><span class="sodo-empty-icon">${opts.emptyIcon||'🏫'}</span><p>Chưa có sơ đồ.<br>Người có quyền <b>Chỉnh sửa Sơ Đồ Lớp</b> có thể tạo sơ đồ.</p></div>`;
    return;
  }
  const rows = layout.length;
  const cols = Math.max(...layout.map(r => r.length));
  const frontLabel = opts.frontLabel || '🖥️ &nbsp;BẢNG &nbsp;—&nbsp; PHÍA TRƯỚC &nbsp;🖥️';

  let html = `<div class="sodo-board-label">${frontLabel}</div><div class="sodo-grid" style="--sodo-cols:${cols}">`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = layout[r]?.[c];
      const seatType = cell?.seatType || opts.seatType || 'double';
      // Tính vị trí trong nhóm bàn
      const { deskPos, deskQuadIdx } = getDeskPosition(r, c, seatType);
      
      const deskAttrs = `data-col="${c}" data-row="${r}" data-desk-pos="${deskPos}" data-seat-type="${seatType}" data-quad-idx="${deskQuadIdx}"`;

      if (!cell || cell.empty) {
        html += `<div class="sodo-cell sodo-cell-empty sodo-seat-${seatType}" ${deskAttrs}><span class="sodo-empty-seat">—</span></div>`;
        continue;
      }
      if (cell.type === 'anyone') {
        html += `<div class="sodo-cell sodo-cell-anyone sodo-seat-${seatType}" ${deskAttrs} title="${sodoEsc(cell.label||'Bất Kỳ')}">
          <div class="sodo-seat-avatar sodo-avatar-anyone">?</div>
          <div class="sodo-seat-name sodo-anyone-name">${sodoEsc(cell.label||'Bất Kỳ')}</div>
        </div>`;
        continue;
      }
      const stu = cell.studentId ? STUDENTS.find(s => s.id === cell.studentId) : null;
      const name = stu ? stu.name : (cell.label || '?');
      html += `<div class="sodo-cell sodo-cell-filled sodo-seat-${seatType}" ${deskAttrs} title="${sodoEsc(name)}">
        <div class="sodo-seat-avatar" style="background:${getAvatarGradient(name)}">${getInitials(name)}</div>
        <div class="sodo-seat-name">${sodoEsc(sodoShortName(name))}</div>
      </div>`;
    }
  }
  html += `</div>`;
  el.innerHTML = html;
}

// ============= OPEN EDITOR =============
function openEditor(mode, chartId) {
  editorMode = mode; editorChartId = chartId;
  editorUndoStack = []; editorRedoStack = [];
  editorSelectedCell = null; dragStudentId = null; dragFromCell = null; dragIsAnyone = false;
  editorAnyoneCounter = 0; editorPickedIcon = '🪑';

  const isNew = chartId === '__new__';

  if (mode === 'default') {
    const d = sodoData.default;
    if (d?.layout) _loadLayout(d, 'double');
    else _emptyLayout(SODO_DEFAULT_ROWS, SODO_DEFAULT_COLS, 'double');
    editorExtraPeople = [];
    showEditor('Sơ Đồ Lớp Hiện Tại', '🏫', false, false);

  } else if (mode === 'subject') {
    const sub = sodoData.subjects[chartId]; const fallback = sodoData.default;
    if (sub?.layout) _loadLayout(sub, 'double');
    else if (fallback?.layout) _loadLayout(fallback, 'double');
    else _emptyLayout(SODO_DEFAULT_ROWS, SODO_DEFAULT_COLS, 'double');
    editorExtraPeople = [];
    const s = SODO_SUBJECT_LIST.find(x => x.key === chartId);
    showEditor(`Môn ${s?.label || chartId}`, s?.icon || '📚', false, false);

  } else if (mode === 'outdoor') {
    const o = SODO_OUTDOOR_LIST.find(x => x.key === chartId);
    const od = sodoData.outdoor[chartId];
    if (od?.layout) _loadLayout(od, o.seatType);
    else _emptyLayout(o.defaultRows, o.defaultCols, o.seatType);
    editorExtraPeople = []; editorDefaultSeatType = o.seatType;
    showEditor(`${o.label}`, o.icon, false, false);

  } else {
    // outdoor_custom | custom
    const col = mode;
    const existing = isNew ? null : sodoData[col]?.[chartId];
    if (existing?.layout) {
      _loadLayout(existing, existing.layout[0]?.[0]?.seatType || (col==='outdoor_custom'?'chair':'double'));
      editorExtraPeople = sodoClone(existing.extraPeople || []);
    } else {
      const defSeat = col === 'outdoor_custom' ? 'chair' : 'double';
      _emptyLayout(SODO_DEFAULT_ROWS, SODO_DEFAULT_COLS, defSeat);
      editorExtraPeople = [];
    }
    if (isNew) editorChartId = '__new_' + Date.now();
    editorPickedIcon = existing?.icon || (col==='outdoor_custom' ? '🏟️' : '🪑');
    showEditor(existing?.name || 'Sơ Đồ Mới', editorPickedIcon, true, true,
      existing?.name || '', existing?.isPublic !== false);
  }
}

function _loadLayout(data, defSeatType) {
  editorLayout = sodoClone(data.layout);
  editorRows = data.rows || editorLayout.length;
  editorCols = data.cols || Math.max(...editorLayout.map(r => r.length));
  editorDefaultSeatType = defSeatType;
}

function _emptyLayout(rows, cols, seatType) {
  editorRows = rows; editorCols = cols; editorDefaultSeatType = seatType;
  editorLayout = emptyGrid(rows, cols, seatType);
}

// ============= SHOW EDITOR =============
function showEditor(title, icon, allowExtra, showNameInput, existingName = '', existingPublic = true) {
  const ov = document.getElementById('sodo-editor-overlay');
  if (!ov) return;
  ov.innerHTML = buildEditorHTML(title, icon, allowExtra, showNameInput, existingName, existingPublic);
  ov.classList.add('active');
  document.body.style.overflow = 'hidden';
  editorRenderGrid();
  editorRenderSidebar();
}

function buildEditorHTML(title, icon, allowExtra, showNameInput, existingName, existingPublic) {
  return `
    <div class="sodo-editor">
      <div class="sodo-editor-header">
        <div class="sodo-editor-title">
          <span>✏️ Đang chỉnh sửa</span>
          <h3>${sodoEsc(icon)} ${sodoEsc(title)}</h3>
        </div>
        <div class="sodo-editor-header-actions">
          <button class="sodo-editor-btn" onclick="editorUndo()" title="Ctrl+Z">↩️ Hoàn Tác</button>
          <button class="sodo-editor-btn" onclick="editorRedo()" title="Ctrl+Y">↪️ Làm Lại</button>
          <button class="sodo-editor-btn sodo-editor-btn-reset" onclick="editorReset()">🔄 Reset</button>
          <button class="sodo-editor-btn sodo-editor-btn-save"  onclick="editorSave()">💾 Lưu</button>
          <button class="sodo-editor-btn sodo-editor-btn-close" onclick="closeEditor()">✕ Đóng</button>
        </div>
      </div>

      <div class="sodo-editor-body">
        <!-- Sidebar -->
        <div class="sodo-editor-sidebar">
          <!-- "Bất Kỳ" Token -->
          <div class="sodo-anyone-slot-row">
            <div class="sodo-sidebar-item sodo-anyone-token" draggable="true"
              ondragstart="sidebarDragStartAnyone(event)" ondragend="dragEndCleanup(event)"
              title="Kéo vào ghế để đặt chỗ mở — ai cũng có thể ngồi">
              <div class="sodo-sidebar-avatar sodo-anyone-avatar-sm">?</div>
              <span class="sodo-sidebar-name">Bất Kỳ &nbsp;<small style="opacity:.55">(ai cũng được)</small></span>
            </div>
          </div>

          <div class="sodo-editor-sidebar-header">
            <h4>👥 Học Sinh</h4>
            <span id="sodo-placed-count" class="sodo-placed-count">0/${STUDENTS.length}</span>
          </div>
          <div class="sodo-search-box">
            <input id="sodo-sidebar-search" type="text" placeholder="🔍 Tìm học sinh..." oninput="editorFilterSidebar(this.value)">
          </div>
          <div id="sodo-sidebar-list" class="sodo-sidebar-list"></div>

          ${allowExtra ? `
            <div class="sodo-extra-people">
              <p class="sodo-extra-people-title">➕ Người Ngoài Lớp</p>
              <div class="sodo-add-person-form">
                <input id="sodo-extra-name" type="text" placeholder="Nhập tên...">
                <button onclick="editorAddExtra()">Thêm</button>
              </div>
              <div id="sodo-extra-list"></div>
            </div>` : ''}
        </div>

        <!-- Canvas -->
        <div class="sodo-editor-canvas">
          <div class="sodo-editor-canvas-header">
            <div class="sodo-grid-controls">
              <button class="sodo-ctrl-btn" onclick="editorAddRow()" title="Thêm hàng cuối">+ Hàng</button>
              <button class="sodo-ctrl-btn" onclick="editorRemoveRow()" title="Xóa hàng cuối">− Hàng</button>
              <button class="sodo-ctrl-btn" onclick="editorAddCol()" title="Thêm cột cuối">+ Cột</button>
              <button class="sodo-ctrl-btn" onclick="editorRemoveCol()" title="Xóa cột cuối">− Cột</button>
              <span class="sodo-grid-size-badge" id="sodo-grid-size">${editorRows} × ${editorCols}</span>
            </div>
            <div class="sodo-desk-type-controls">
              <label>Loại:</label>
              ${SODO_SEAT_TYPE_LIST.map(t => `
                <button class="sodo-ctrl-btn ${editorDefaultSeatType===t.key?'active':''}"
                  id="btn-seat-${t.key}" title="${t.desc}" onclick="editorSetSeatType('${t.key}')">
                  ${t.icon} ${t.label}</button>`).join('')}
            </div>
          </div>

          <div class="sodo-board-label-editor">🖥️ &nbsp;PHÍA TRƯỚC / HƯỚNG NHÌN &nbsp;🖥️</div>

          <div class="sodo-editor-grid-wrapper">
            <div id="sodo-editor-grid" class="sodo-editor-grid" style="--sodo-cols:${editorCols}"></div>
          </div>

          <div class="sodo-editor-legend">
            💡 Kéo học sinh / Bất Kỳ vào ghế &nbsp;·&nbsp; Kéo trong bảng để hoán đổi &nbsp;·&nbsp; Chuột phải để tùy chọn &nbsp;·&nbsp; Ctrl+Z hoàn tác &nbsp;·&nbsp; Ctrl+S lưu
          </div>
        </div>
      </div>

      ${showNameInput ? `
        <div class="sodo-editor-footer">
          <label>Tên sơ đồ:</label>
          <input type="text" id="sodo-chart-name" placeholder="Nhập tên..." value="${sodoEsc(existingName)}">
          <label>Icon:</label>
          <div class="sodo-icon-picker">
            ${SODO_ICONS.map(ic => `
              <button class="sodo-icon-pick-btn ${ic===editorPickedIcon?'active':''}" onclick="pickIcon('${ic}')">${ic}</button>`).join('')}
          </div>
          <label class="sodo-checkbox-label">
            <input type="checkbox" id="sodo-chart-public" ${existingPublic?'checked':''}>
            <span>Hiển thị với mọi người</span>
          </label>
        </div>` : ''}
    </div>

    <!-- Context Menu -->
    <div id="sodo-ctx-menu" class="sodo-context-menu" style="display:none">
      <button onclick="ctxClear()">🚫 Để trống ghế</button>
      <button onclick="ctxSetAnyone()">👤 Đặt thành "Bất Kỳ"</button>
      <button onclick="ctxMarkEmptySeat()">🏷️ Đánh dấu ghế trống</button>
      <hr>
      <button onclick="ctxCycleDesk()">🔄 Đổi loại ghế/bàn</button>
      <hr>
      <button onclick="ctxInsertRowAbove()">＋ Chèn hàng phía trên</button>
      <button onclick="ctxInsertRowBelow()">＋ Chèn hàng phía dưới</button>
      <button onclick="ctxDeleteThisRow()">－ Xóa hàng này</button>
      <button onclick="ctxInsertColLeft()">＋ Chèn cột bên trái</button>
      <button onclick="ctxInsertColRight()">＋ Chèn cột bên phải</button>
      <button onclick="ctxDeleteThisCol()">－ Xóa cột này</button>
      <hr>
      <button onclick="ctxSwap()">🔁 Hoán đổi với ghế đã chọn</button>
      <hr>
      <button class="ctx-danger" onclick="ctxClear()">❌ Xóa người ngồi</button>
    </div>`;
}

function pickIcon(ic) {
  editorPickedIcon = ic;
  document.querySelectorAll('.sodo-icon-pick-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === ic));
}

// ============= EDITOR GRID RENDER =============
function editorRenderGrid() {
  const grid = document.getElementById('sodo-editor-grid');
  if (!grid) return;
  grid.style.setProperty('--sodo-cols', editorCols);
  let html = '';
  for (let r = 0; r < editorRows; r++)
    for (let c = 0; c < editorCols; c++)
      html += buildEditorCell(r, c);
  grid.innerHTML = html;
  editorUpdateCount();
  editorUpdateBtns();
}

function buildEditorCell(r, c) {
  const cell = editorLayout[r]?.[c] || makeEmptyCell();
  const isEmpty = !cell.studentId && !cell.label && cell.type !== 'anyone';
  const seatType = cell.seatType || editorDefaultSeatType;
  
   const { deskPos, deskQuadIdx } = getDeskPosition(r, c, seatType);

  const isSelected = editorSelectedCell?.r === r && editorSelectedCell?.c === c;
  const selCls = isSelected ? 'sodo-cell-selected' : '';

  const base = `data-row="${r}" data-col="${c}" data-desk-pos="${deskPos}" data-seat-type="${seatType}" data-quad-idx="${deskQuadIdx}"`;
  const drop = `ondragover="cellDragOver(event,${r},${c})" ondrop="cellDrop(event,${r},${c})" ondragleave="cellDragLeave(event)"`;
  const events = `onclick="cellClick(${r},${c})" oncontextmenu="showCtxMenu(event,${r},${c})"`;

  if (cell.type === 'anyone') {
    return `<div class="sodo-editor-cell sodo-editor-cell-anyone sodo-seat-${seatType} ${selCls}"
      ${base} ${drop} ${events} draggable="true"
      ondragstart="cellDragStart(event,${r},${c})" ondragend="dragEndCleanup(event)"
      title="${sodoEsc(cell.label||'Bất Kỳ')}">
      <div class="sodo-editor-avatar sodo-avatar-anyone">?</div>
      <div class="sodo-editor-name sodo-anyone-name">${sodoEsc(cell.label||'Bất Kỳ')}</div>
    </div>`;
  }

  if (isEmpty) {
    return `<div class="sodo-editor-cell sodo-editor-cell-empty sodo-seat-${seatType} ${selCls}"
      ${base} ${drop} ${events}>
      <span class="sodo-empty-plus">+</span>
    </div>`;
  }

  const allPeople = [...STUDENTS, ...editorExtraPeople];
  const person = allPeople.find(s => s.id === cell.studentId);
  const name = person ? person.name : (cell.label || '?');
  const isExtra = editorExtraPeople.some(ep => ep.id === cell.studentId);
  const seatIcon = SODO_SEAT_TYPE_LIST.find(t => t.key === seatType)?.icon || '▣';

  return `<div class="sodo-editor-cell sodo-editor-cell-filled sodo-seat-${seatType} ${selCls}"
    ${base} ${drop} ${events} draggable="true"
    ondragstart="cellDragStart(event,${r},${c})" ondragend="dragEndCleanup(event)"
    title="${sodoEsc(name)}">
    <div class="sodo-editor-avatar" style="background:${getAvatarGradient(name)}">${getInitials(name)}</div>
    <div class="sodo-editor-name">${sodoEsc(sodoShortName(name))}</div>
    ${isExtra ? '<div class="sodo-extra-badge">★</div>' : ''}
    <div class="sodo-desk-badge">${seatIcon}</div>
  </div>`;
}

// ============= SIDEBAR =============
function editorRenderSidebar(fv = '') {
  const list = document.getElementById('sodo-sidebar-list');
  if (!list) return;
  const placedIds = editorGetPlacedIds();
  const f = fv.toLowerCase();
  const unplaced = STUDENTS.filter(s => !placedIds.has(s.id) && (!f || s.name.toLowerCase().includes(f)));
  const unplacedExtra = editorExtraPeople.filter(ep => !placedIds.has(ep.id) && (!f || ep.name.toLowerCase().includes(f)));

  if (!unplaced.length && !unplacedExtra.length) {
    list.innerHTML = `<div class="sodo-sidebar-empty">${f ? '🔍 Không tìm thấy' : '✅ Tất cả đã được xếp chỗ!'}</div>`;
  } else {
    list.innerHTML = [
      ...unplaced.map(s => sidebarItemHTML(s.id, s.name, false)),
      ...unplacedExtra.map(ep => sidebarItemHTML(ep.id, ep.name, true))
    ].join('');
  }
  editorUpdateCount();
  editorRenderExtraList();
}

function sidebarItemHTML(id, name, isExtra) {
  return `<div class="sodo-sidebar-item ${isExtra?'sodo-sidebar-extra':''}" draggable="true"
    ondragstart="sidebarDragStart(event,${id})" ondragend="dragEndCleanup(event)">
    <div class="sodo-sidebar-avatar" style="background:${getAvatarGradient(name)}">${getInitials(name)}</div>
    <span class="sodo-sidebar-name">${sodoEsc(name)}${isExtra?' ★':''}</span>
  </div>`;
}

function editorFilterSidebar(val) { editorRenderSidebar(val); }

function editorGetPlacedIds() {
  const ids = new Set();
  for (let r=0;r<editorRows;r++) for (let c=0;c<editorCols;c++) {
    const cell = editorLayout[r]?.[c];
    if (cell?.studentId) ids.add(cell.studentId);
  }
  return ids;
}

function editorUpdateCount() {
  const el = document.getElementById('sodo-placed-count');
  if (!el) return;
  const placed = [...editorGetPlacedIds()].filter(id => STUDENTS.some(s => s.id === id)).length;
  el.textContent = `${placed}/${STUDENTS.length}`;
  el.classList.toggle('all-placed', placed === STUDENTS.length);
}

function editorUpdateBtns() {
  const sz = document.getElementById('sodo-grid-size');
  if (sz) sz.textContent = `${editorRows} × ${editorCols}`;
}

function editorRenderExtraList() {
  const el = document.getElementById('sodo-extra-list');
  if (!el) return;
  el.innerHTML = editorExtraPeople.map(ep => `
    <div class="sodo-extra-item">
      <span>${sodoEsc(ep.name)}</span>
      <button onclick="editorRemoveExtra(${ep.id})">✕</button>
    </div>`).join('');
}

// ============= DRAG & DROP =============
function sidebarDragStart(event, studentId) {
  dragStudentId = studentId; dragFromCell = null; dragIsAnyone = false;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', 's:' + studentId);
  setTimeout(() => event.target.classList.add('dragging'), 0);
}

function sidebarDragStartAnyone(event) {
  dragStudentId = null; dragFromCell = null; dragIsAnyone = true;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', 'anyone');
}

function cellDragStart(event, r, c) {
  const cell = editorLayout[r]?.[c];
  if (!cell || (!cell.studentId && cell.type !== 'anyone')) { event.preventDefault(); return; }
  dragStudentId = cell.studentId || null;
  dragIsAnyone  = cell.type === 'anyone';
  dragFromCell  = { r, c };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', `c:${r}:${c}`);
  setTimeout(() => event.target.classList.add('dragging'), 0);
}

function cellDragOver(event, r, c) {
  event.preventDefault();
  event.dataTransfer.dropEffect = dragIsAnyone ? 'copy' : 'move';
  event.currentTarget.classList.add('drag-over');
}

function cellDragLeave(event) { event.currentTarget.classList.remove('drag-over'); }

function cellDrop(event, r, c) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');

  const target = editorLayout[r]?.[c] || makeEmptyCell();

  if (dragIsAnyone && !dragFromCell) {
    editorPushUndo();
    editorAnyoneCounter++;
    editorLayout[r][c] = { ...target, type:'anyone', studentId:null, label:`Bất Kỳ ${editorAnyoneCounter}`, empty:false };
    dragIsAnyone = false;
    editorRenderGrid();
    return;
  }

  if (dragFromCell !== null) {
    const src = editorLayout[dragFromCell.r]?.[dragFromCell.c] || makeEmptyCell();
    const srcSeatType = src.seatType || editorDefaultSeatType;
    const tgtSeatType = target.seatType || editorDefaultSeatType;

    if (srcSeatType !== tgtSeatType) {
      showToast('Không thể kéo thả giữa hai loại bàn khác nhau', 'warning');
      return;
    }

    if ((srcSeatType === 'quad' || srcSeatType === 'double' || srcSeatType === 'quad_h' || srcSeatType === 'quad_v') && !isSameTable(dragFromCell.r, dragFromCell.c, r, c)) {
      showToast('Chỉ kéo thả trong cùng một bàn', 'warning');
      return;
    }

    editorPushUndo();
    const srcData = { type:src.type, studentId:src.studentId, label:src.label, empty:src.empty };
    const tgtData = { type:target.type, studentId:target.studentId, label:target.label, empty:target.empty };
    editorLayout[r][c]                         = { ...target, ...srcData };
    editorLayout[dragFromCell.r][dragFromCell.c] = { ...src, ...tgtData };
  } else if (dragStudentId !== null) {
    const person = [...STUDENTS, ...editorExtraPeople].find(s => s.id === dragStudentId);
    if (!person) return;

    const seatType = target.seatType || editorDefaultSeatType;
    if (isMultiSeatTable(seatType) && getTableOccupiedCount(r, c) >= getTableCapacity(seatType)) {
      showToast(`Bàn này đã đủ ${getTableCapacity(seatType)} người`, 'warning');
      return;
    }

    editorPushUndo();
    editorLayout[r][c] = { ...target, type:'student', studentId:person.id, label:person.name, empty:false };
  }

  dragStudentId = null; dragFromCell = null;
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value || '');
}

function dragEndCleanup(event) {
  dragStudentId = null; dragFromCell = null; dragIsAnyone = false;
  event.target.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// ============= CELL CLICK =============
function cellClick(r, c) {
  if (editorSelectedCell) {
    const sel = editorSelectedCell;
    if (sel.r === r && sel.c === c) {
      editorSelectedCell = null;
      editorRenderGrid();
      return;
    }

    const src = editorLayout[sel.r]?.[sel.c];
    const tgt = editorLayout[r]?.[c];
    const srcOccupied = src && (src.type === 'student' || src.type === 'anyone');
    const tgtOccupied = tgt && (tgt.type === 'student' || tgt.type === 'anyone');

    if (srcOccupied && !tgtOccupied) {
      editorPushUndo();
      editorLayout[r][c] = { ...tgt, ...src };
      editorLayout[sel.r][sel.c] = makeEmptyCell(src.seatType || editorDefaultSeatType);
      editorSelectedCell = null;
      editorRenderGrid();
      editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value || '');
      return;
    }

    if (srcOccupied && tgtOccupied) {
      editorPushUndo();
      const srcData = { type:src.type, studentId:src.studentId, label:src.label, empty:src.empty };
      const tgtData = { type:tgt.type, studentId:tgt.studentId, label:tgt.label, empty:tgt.empty };
      Object.assign(editorLayout[sel.r][sel.c], tgtData);
      Object.assign(editorLayout[r][c], srcData);
      editorSelectedCell = null;
      editorRenderGrid();
      editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value || '');
      return;
    }
  }

  editorSelectedCell = { r, c };
  editorRenderGrid();
}

// ============= CONTEXT MENU =============
function showCtxMenu(event, r, c) {
  event.preventDefault();
  ctxRow = r; ctxCol = c;
  const menu = document.getElementById('sodo-ctx-menu');
  if (!menu) return;

  const btnSplit = document.getElementById('ctx-btn-split');
  if (btnSplit) {
    const seatType = editorLayout[r]?.[c]?.seatType || editorDefaultSeatType;
    btnSplit.style.display = isMultiSeatTable(seatType) ? 'block' : 'none';
  }

  menu.style.display = 'block';
  menu.style.left = Math.min(event.clientX, window.innerWidth  - 220) + 'px';
  menu.style.top  = Math.min(event.clientY, window.innerHeight - 180) + 'px';
  setTimeout(() => document.addEventListener('click', hideCtxMenu, { once:true }), 0);
}

function hideCtxMenu() {
  const m = document.getElementById('sodo-ctx-menu');
  if (m) m.style.display = 'none';
}

function ctxClear() {
  if (ctxRow===null) return;
  editorPushUndo();
  const seatType = editorLayout[ctxRow]?.[ctxCol]?.seatType || editorDefaultSeatType;
  editorLayout[ctxRow][ctxCol] = makeEmptyCell(seatType);
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
  hideCtxMenu();
}

function ctxSetAnyone() {
  if (ctxRow===null) return;
  editorPushUndo();
  editorAnyoneCounter++;
  const cell = editorLayout[ctxRow]?.[ctxCol] || makeEmptyCell();
  editorLayout[ctxRow][ctxCol] = { ...cell, type:'anyone', studentId:null, label:`Bất Kỳ ${editorAnyoneCounter}`, empty:false };
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
  hideCtxMenu();
}

function ctxCycleDesk() {
  if (ctxRow===null) return;
  editorPushUndo();
  const cell = editorLayout[ctxRow]?.[ctxCol];
  if (!cell) return;
  const keys = SODO_SEAT_TYPE_LIST.map(t => t.key);
  const newType = keys[(keys.indexOf(cell.seatType||'double') + 1) % keys.length];

  if (isMultiSeatTable(newType)) {
    const group = getTableGroupCells(ctxRow, ctxCol, newType);
    group.forEach(([r, c]) => {
      if (editorLayout[r]?.[c]) editorLayout[r][c].seatType = newType;
    });
  } else {
    cell.seatType = newType;
  }

  editorRenderGrid();
  hideCtxMenu();
}

function ctxSwap() {
  if (ctxRow===null || !editorSelectedCell) { showToast('Hãy chọn một ghế khác trước (nhấn vào ghế)', 'warning'); hideCtxMenu(); return; }

  const a = editorLayout[ctxRow][ctxCol];
  const b = editorLayout[editorSelectedCell.r][editorSelectedCell.c];

  editorPushUndo();
  const aData = { type:a.type, studentId:a.studentId, label:a.label, empty:a.empty };
  const bData = { type:b.type, studentId:b.studentId, label:b.label, empty:b.empty };
  Object.assign(editorLayout[ctxRow][ctxCol], bData);
  Object.assign(editorLayout[editorSelectedCell.r][editorSelectedCell.c], aData);
  editorSelectedCell = null;
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
  hideCtxMenu();
}

function ctxMarkEmptySeat() {
  if (ctxRow===null) return;
  editorPushUndo();
  editorLayout[ctxRow][ctxCol] = { type:'empty', studentId:null, label:'Ghế trống', empty:true, seatType: editorLayout[ctxRow][ctxCol].seatType || editorDefaultSeatType };
  editorRenderGrid();
  hideCtxMenu();
}

function ctxInsertRowAbove() {
  if (ctxRow===null) return;
  editorInsertRowAt(ctxRow);
  hideCtxMenu();
}

function ctxInsertRowBelow() {
  if (ctxRow===null) return;
  editorInsertRowAt(ctxRow + 1);
  hideCtxMenu();
}

function ctxDeleteThisRow() {
  if (ctxRow===null) return;
  editorDeleteRowAt(ctxRow);
  hideCtxMenu();
}

function ctxInsertColLeft() {
  if (ctxCol===null) return;
  editorInsertColAt(ctxCol);
  hideCtxMenu();
}

function ctxInsertColRight() {
  if (ctxCol===null) return;
  editorInsertColAt(ctxCol + 1);
  hideCtxMenu();
}

function ctxDeleteThisCol() {
  if (ctxCol===null) return;
  editorDeleteColAt(ctxCol);
  hideCtxMenu();
}

// ============= SEAT TYPE =============
function editorSetSeatType(type) {
  editorDefaultSeatType = type;
  SODO_SEAT_TYPE_LIST.forEach(t => document.getElementById(`btn-seat-${t.key}`)?.classList.toggle('active', t.key===type));
}

// ============= UNDO / REDO =============
function editorPushUndo() { editorUndoStack.push(sodoClone(editorLayout)); if(editorUndoStack.length>60)editorUndoStack.shift(); editorRedoStack=[]; }
function editorUndo() { if(!editorUndoStack.length){showToast('Không có gì để hoàn tác','info');return;} editorRedoStack.push(sodoClone(editorLayout)); editorLayout=editorUndoStack.pop(); editorRenderGrid(); editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||''); }
function editorRedo() { if(!editorRedoStack.length){showToast('Không có gì để làm lại','info');return;} editorUndoStack.push(sodoClone(editorLayout)); editorLayout=editorRedoStack.pop(); editorRenderGrid(); editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||''); }

// ============= GRID RESIZE =============
function editorAddRow()    { editorPushUndo(); editorRows++; editorLayout.push(Array.from({length:editorCols},()=>makeEmptyCell())); editorRenderGrid(); }
function editorRemoveRow() { editorPushUndo(); editorRows--; editorLayout.pop(); editorRenderGrid(); editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||''); }
function editorAddCol()    { editorPushUndo(); editorCols++; editorLayout.forEach(r=>r.push(makeEmptyCell())); editorRenderGrid(); }
function editorRemoveCol() { editorPushUndo(); editorCols--; editorLayout.forEach(r=>r.pop()); editorRenderGrid(); editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||''); }

function editorInsertRowAt(atIndex) {
  if (atIndex < 0 || atIndex > editorRows) return;
  editorPushUndo();
  const newRow = Array.from({length:editorCols},()=>makeEmptyCell());
  editorLayout.splice(atIndex, 0, newRow);
  editorRows++;
  editorRenderGrid();
}

function editorInsertColAt(atIndex) {
  if (atIndex < 0 || atIndex > editorCols) return;
  editorPushUndo();
  editorLayout.forEach(r => r.splice(atIndex, 0, makeEmptyCell()));
  editorCols++;
  editorRenderGrid();
}

function editorDeleteRowAt(atIndex) {
  if (atIndex < 0 || atIndex >= editorRows) return;
  editorPushUndo();
  editorLayout.splice(atIndex, 1);
  editorRows--;
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
}

function editorDeleteColAt(atIndex) {
  if (atIndex < 0 || atIndex >= editorCols) return;
  editorPushUndo();
  editorLayout.forEach(r => r.splice(atIndex, 1));
  editorCols--;
  editorRenderGrid();
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
}

// ============= EXTRA PEOPLE =============
function editorAddExtra() {
  const inp = document.getElementById('sodo-extra-name');
  if (!inp?.value.trim()) return;
  extraIdSeed++;
  editorExtraPeople.push({ id:extraIdSeed, name:inp.value.trim() });
  inp.value = '';
  editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
}

function editorRemoveExtra(id) {
  editorPushUndo();
  editorExtraPeople = editorExtraPeople.filter(ep => ep.id !== id);
  for(let r=0;r<editorRows;r++) for(let c=0;c<editorCols;c++)
    if(editorLayout[r]?.[c]?.studentId===id) editorLayout[r][c]=makeEmptyCell();
  editorRenderGrid(); editorRenderSidebar(document.getElementById('sodo-sidebar-search')?.value||'');
}

// ============= RESET =============
function editorReset() {
  showConfirm('Reset sơ đồ','Đặt lại toàn bộ về trống? Không thể hoàn tác.',()=>{
    editorUndoStack=[]; editorRedoStack=[];
    editorLayout=emptyGrid(editorRows,editorCols,editorDefaultSeatType);
    editorRenderGrid(); editorRenderSidebar('');
  });
}

// ============= SAVE =============
async function editorSave() {
  const user = getCurrentUser();
  const now = new Date().toISOString();

  if (editorMode === 'default') {
    const data = { layout:editorLayout, rows:editorRows, cols:editorCols, updatedAt:now, updatedBy:user?.name||'' };
    sodoData.default = data;
    await sodoSave('default', data);
    closeSodoOverlay(); renderInClassTab();

  } else if (editorMode === 'subject') {
    const data = { layout:editorLayout, rows:editorRows, cols:editorCols, updatedAt:now, updatedBy:user?.name||'' };
    sodoData.subjects[editorChartId] = data;
    await sodoSave(`subjects/${editorChartId}`, data);
    closeSodoOverlay(); renderSubjectTab();

  } else if (editorMode === 'outdoor') {
    const data = { layout:editorLayout, rows:editorRows, cols:editorCols, updatedAt:now, updatedBy:user?.name||'' };
    sodoData.outdoor[editorChartId] = data;
    await sodoSave(`outdoor/${editorChartId}`, data);
    closeSodoOverlay(); renderOutdoorTab();

  } else {
    const nameEl = document.getElementById('sodo-chart-name');
    const pubEl  = document.getElementById('sodo-chart-public');
    const chartName = nameEl?.value.trim() || 'Sơ đồ không tên';
    const isPublic  = pubEl ? pubEl.checked : true;
    const existing  = sodoData[editorMode]?.[editorChartId] || {};
    const data = {
      name:chartName, icon:editorPickedIcon,
      layout:editorLayout, rows:editorRows, cols:editorCols,
      extraPeople:editorExtraPeople, isPublic,
      createdBy: existing.createdBy || user?.name || 'Unknown',
      createdAt: existing.createdAt || now,
      updatedAt:now, updatedBy:user?.name||''
    };
    sodoData[editorMode][editorChartId] = data;
    await sodoSave(`${editorMode}/${editorChartId}`, data);
    closeSodoOverlay(); sodoRenderActiveTab();
  }
}

function closeEditor() {
  showConfirm('Thoát editor','Thoát mà không lưu? Thay đổi sẽ mất.',()=>{ closeSodoOverlay(); editorMode=null; });
}

// ============= KEYBOARD =============
document.addEventListener('keydown', e => {
  if (!document.getElementById('sodo-editor-overlay')?.classList.contains('active')) return;
  if (e.ctrlKey && e.key==='z') { e.preventDefault(); editorUndo(); }
  if (e.ctrlKey && e.key==='y') { e.preventDefault(); editorRedo(); }
  if (e.ctrlKey && e.key==='s') { e.preventDefault(); editorSave(); }
  if (e.key==='Escape') {
    const m = document.getElementById('sodo-ctx-menu');
    if (m?.style.display!=='none') { hideCtxMenu(); return; }
    closeEditor();
  }
});

// ============= TABLE GROUP LOGIC =============
function getTableGroupCells(r, c, seatType) {
  const type = seatType || (editorLayout[r]?.[c]?.seatType) || editorDefaultSeatType;
  const cells = [];

  if (type === 'quad') {
    const baseR = Math.floor(r / 2) * 2;
    const baseC = Math.floor(c / 2) * 2;
    for (let dr = 0; dr < 2; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        const rr = baseR + dr, cc = baseC + dc;
        if (rr < editorRows && cc < editorCols && editorLayout[rr]?.[cc]?.seatType === 'quad') {
          cells.push([rr, cc]);
        }
      }
    }
  } else if (type === 'double') {
    const pairC = (c % 2 === 0) ? c : c - 1;
    for (let dc = 0; dc < 2; dc++) {
      const cc = pairC + dc;
      if (cc < editorCols && editorLayout[r]?.[cc]?.seatType === 'double') {
        cells.push([r, cc]);
      }
    }
  } else if (type === 'quad_h') {
    const baseC = Math.floor(c / 4) * 4;
    for (let dc = 0; dc < 4; dc++) {
      const cc = baseC + dc;
      if (cc < editorCols && editorLayout[r]?.[cc]?.seatType === 'quad_h') {
        cells.push([r, cc]);
      }
    }
  } else if (type === 'quad_v') {
    const baseR = Math.floor(r / 4) * 4;
    for (let dr = 0; dr < 4; dr++) {
      const rr = baseR + dr;
      if (rr < editorRows && editorLayout[rr]?.[c]?.seatType === 'quad_v') {
        cells.push([rr, c]);
      }
    }
  } else {
    cells.push([r, c]);
  }

  return cells;
}

function getTableCapacity(seatType) {
  if (seatType === 'quad' || seatType === 'quad_h' || seatType === 'quad_v') return 4;
  if (seatType === 'double') return 2;
  return 1;
}

function getTableOccupiedCount(r, c) {
  const group = getTableGroupCells(r, c);
  return group.filter(([rr, cc]) => editorLayout[rr]?.[cc]?.type === 'student').length;
}

function isSameTable(r1, c1, r2, c2) {
  const group = getTableGroupCells(r1, c1);
  return group.some(([rr, cc]) => rr === r2 && cc === c2);
}

function isMultiSeatTable(seatType) {
  return getTableCapacity(seatType) > 1;
}

function getDeskPosition(r, c, seatType) {
  const type = seatType || 'double';
  if (type === 'double') {
    return { deskPos: c % 2 === 0 ? 'left' : 'right', deskQuadIdx: c % 2 };
  }
  if (type === 'quad') {
    return { deskPos: c % 2 === 0 ? 'left' : 'right', deskQuadIdx: (r % 2) * 2 + (c % 2) };
  }
  if (type === 'quad_h') {
    const baseC = Math.floor(c / 4) * 4;
    const idx = c - baseC;
    return { deskPos: ['left', 'mid1', 'mid2', 'right'][idx] || 'left', deskQuadIdx: idx };
  }
  if (type === 'quad_v') {
    const baseR = Math.floor(r / 4) * 4;
    const idx = r - baseR;
    return { deskPos: ['top', 'upper-mid', 'lower-mid', 'bottom'][idx] || 'left', deskQuadIdx: idx };
  }
  return { deskPos: 'left', deskQuadIdx: 0 };
}

// ============= HELPERS =============
function makeEmptyCell(seatType) {
  return { type:'empty', studentId:null, label:'', empty:true, seatType: seatType||editorDefaultSeatType };
}
function emptyGrid(rows, cols, seatType) {
  return Array.from({length:rows},()=>Array.from({length:cols},()=>makeEmptyCell(seatType)));
}
function sodoClone(obj) { return JSON.parse(JSON.stringify(obj)); }
function sodoEsc(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sodoShortName(n) { if(!n)return'?'; const p=n.trim().split(' '); return p.length<=2?n:p.slice(-2).join(' '); }
function sodoRelTime(iso) {
  if(!iso)return''; const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000);
  if(m<1)return'vừa xong'; if(m<60)return`${m} phút trước`;
  const h=Math.floor(m/60); if(h<24)return`${h} giờ trước`;
  const day=Math.floor(h/24); return day<7?`${day} ngày trước`:new Date(iso).toLocaleDateString('vi-VN');
}

// ============= INIT =============
window.addEventListener('load', () => {
  if (!isLoggedIn()) { window.location.href = buildUrl('../login.html'); return; }
  const user = getCurrentUser();
  if (user) {
    const nm = document.getElementById('userNameDisplay');
    if (nm) nm.textContent = user.name;
    const av = document.getElementById('userAvatarMini');
    if (av) { av.textContent = getInitials(user.name); av.style.background = getAvatarGradient(user.name); }
  }
  sodoLoadFromFirebase();
});
