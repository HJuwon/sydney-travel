/* ═══════════════════════════════════════════════════
   add.js — 앱 안에서 일정/맛집/팁/관광지 추가 + 수정
   ─────────────────────────────────────────────────
   • 추가: Apps Script(addItem)로 시트에 행 append
   • 수정: Apps Script(updateItem)로 기존 행을 match 후 덮어씀
   둘 다 화면에 즉시 반영합니다. (GAS는 apps-script.gs 최신 코드로 배포 필요)
═══════════════════════════════════════════════════ */

// 카테고리별 입력 필드 정의 (key 는 시트의 헤더명과 정확히 일치해야 함)
const ADD_FIELDS = {
  schedule: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true, min:0 },
    { key:'order', label:'순서',       type:'number', half:true, min:0 },
    { key:'time',  label:'시간',        placeholder:'09:00', half:true },
    { key:'type',  label:'유형',        type:'select', half:true,
      options:['sight','food','coffee','shop','activity','hotel','transit'] },
    { key:'name',  label:'장소명',      required:true },
    { key:'description', label:'설명',  type:'textarea' },
    { key:'tags',  label:'태그 (쉼표로 구분)', placeholder:'랜드마크, 포토스팟' },
    { key:'lat',   label:'위도 (lat)',  placeholder:'-33.8568', half:true },
    { key:'lng',   label:'경도 (lng)',  placeholder:'151.2153', half:true },
    { key:'addr',  label:'주소' },
    { key:'transit_next', label:'다음 이동수단', placeholder:'도보 10분', half:true },
    { key:'transit_info', label:'이동 정보',     placeholder:'페리 F1', half:true },
    { key:'date',  label:'날짜 (새 Day일 때)',  placeholder:'2026.07.20 (월)', half:true },
    { key:'title1',label:'Day 제목 (새 Day일 때)', placeholder:'하버 브릿지', half:true },
  ],
  food: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true, min:0 },
    { key:'emoji', label:'이모지',      placeholder:'🍜', half:true },
    { key:'name',  label:'맛집명',      required:true },
    { key:'description', label:'설명',  type:'textarea' },
    { key:'price_level', label:'가격대', placeholder:'$$ · 20~40 AUD', half:true },
    { key:'bg_color',    label:'배경색 (hex)', placeholder:'FAECE7', half:true },
    { key:'lat',   label:'위도 (lat)',  placeholder:'-33.8568', half:true },
    { key:'lng',   label:'경도 (lng)',  placeholder:'151.2153', half:true },
    { key:'addr',  label:'주소' },
  ],
  tips: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true, min:0 },
    { key:'icon',  label:'아이콘 (이모지)', placeholder:'💡', half:true },
    { key:'title', label:'제목',        required:true },
    { key:'content', label:'내용',       type:'textarea' },
  ],
  sights: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true, min:0 },
    { key:'icon',  label:'아이콘 (이모지)', placeholder:'📍', half:true },
    { key:'title', label:'제목',        required:true },
    { key:'description', label:'설명',   type:'textarea' },
  ],
};

const ADD_META = {
  schedule: { sheet:'schedule', title:'일정',   emoji:'📅', matchKeys:['day','name','time'] },
  food:     { sheet:'food',     title:'맛집',   emoji:'🍽️', matchKeys:['day','name'] },
  tips:     { sheet:'tips',     title:'여행 팁', emoji:'💡', matchKeys:['day','title'] },
  sights:   { sheet:'sights',   title:'관광지', emoji:'🗽', matchKeys:['day','title'] },
};

let _addCat = null;
let _addMode = 'add';   // 'add' | 'edit'
let _editIdx = -1;      // 수정 시 DATA[cat] 내 절대 인덱스
let _editMatch = null;  // 수정 시 원본 행을 찾기 위한 match 객체

/* HTML 이스케이프 */
function _escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* 모달 폼 빌드 (추가/수정 공용) — values: 미리 채울 값 객체 */
function buildAddForm(cat, values) {
  const fields = ADD_FIELDS[cat];
  let html = '';
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.half && fields[i+1] && fields[i+1].half) {
      html += `<div class="add-field-row">${fieldHtml(f, values)}${fieldHtml(fields[i+1], values)}</div>`;
      i += 2;
    } else {
      html += fieldHtml(f, values);
      i += 1;
    }
  }
  document.getElementById('add-modal-body').innerHTML = html;
}

function fieldHtml(f, values) {
  const reqMark = f.required ? '<span class="req">*</span>' : '';
  const v = (values && values[f.key] !== undefined && values[f.key] !== null) ? String(values[f.key]) : '';
  const minAttr = (f.min !== undefined) ? ` min="${f.min}"` : '';
  let control;
  if (f.type === 'textarea') {
    control = `<textarea name="${f.key}" placeholder="${f.placeholder||''}">${_escHtml(v)}</textarea>`;
  } else if (f.type === 'select') {
    const opts = f.options.map(o => `<option value="${o}"${o === v ? ' selected' : ''}>${o}</option>`).join('');
    control = `<select name="${f.key}">${opts}</select>`;
  } else {
    const type = f.type === 'number' ? 'number' : 'text';
    control = `<input type="${type}" name="${f.key}"${minAttr} placeholder="${f.placeholder||''}" value="${_escAttr(v)}">`;
  }
  return `<div class="add-field">
    <label class="add-field-label">${f.label}${reqMark}</label>
    ${control}
  </div>`;
}

function _openModal() {
  const status = document.getElementById('add-status');
  status.textContent = '';
  status.className = 'add-status';
  document.getElementById('add-submit-btn').disabled = false;
  document.getElementById('add-backdrop').classList.add('show');
  setTimeout(() => {
    const first = document.querySelector('#add-modal-body input, #add-modal-body select, #add-modal-body textarea');
    if (first && first.name !== 'day') first.focus();
  }, 60);
}

/* 추가 모달 */
function openAddModal(cat, day) {
  const meta = ADD_META[cat];
  if (!meta || !ADD_FIELDS[cat]) return;
  _addCat = cat; _addMode = 'add'; _editIdx = -1; _editMatch = null;

  document.getElementById('add-modal-title').innerHTML = `${meta.emoji} <em>${meta.title}</em> 추가`;
  document.getElementById('add-submit-btn').textContent = '추가';
  const prefill = (day !== undefined && day !== null) ? { day: String(day) } : {};
  buildAddForm(cat, prefill);
  _openModal();
}

/* 수정 모달 — idx: DATA[cat] 내 절대 인덱스 */
function openEditModal(cat, idx, e) {
  if (e) e.stopPropagation();
  const meta = ADD_META[cat];
  const orig = (DATA[cat] || [])[idx];
  if (!meta || !orig) return;
  _addCat = cat; _addMode = 'edit'; _editIdx = idx;

  // 원본 행을 찾기 위한 match (수정 전 값 기준)
  _editMatch = {};
  meta.matchKeys.forEach(k => { _editMatch[k] = (orig[k] !== undefined && orig[k] !== null) ? orig[k] : ''; });

  document.getElementById('add-modal-title').innerHTML = `${meta.emoji} <em>${meta.title}</em> 수정`;
  document.getElementById('add-submit-btn').textContent = '저장';
  buildAddForm(cat, orig);
  _openModal();
}

function closeAddModal(e) {
  if (e && e.target !== document.getElementById('add-backdrop')) return;
  document.getElementById('add-backdrop').classList.remove('show');
}

async function submitAdd() {
  const cat = _addCat;
  const meta = ADD_META[cat];
  const fields = ADD_FIELDS[cat];
  const status = document.getElementById('add-status');
  const submitBtn = document.getElementById('add-submit-btn');
  const isEdit = (_addMode === 'edit');

  // 값 수집
  const row = {};
  for (const f of fields) {
    const el = document.querySelector(`#add-modal-body [name="${f.key}"]`);
    row[f.key] = el ? el.value.trim() : '';
  }

  // 필수값 검증
  const missing = fields.filter(f => f.required && !row[f.key]);
  if (missing.length) {
    status.className = 'add-status error';
    status.textContent = `필수 항목을 입력하세요: ${missing.map(m => m.label).join(', ')}`;
    return;
  }

  submitBtn.disabled = true;
  status.className = 'add-status saving';
  status.textContent = '저장 중...';

  // GAS 미설정 → 로컬에만 반영
  if (!GAS_URL) {
    if (isEdit) applyEditLocally(cat, _editIdx, row);
    else applyNewRowLocally(cat, row);
    status.className = 'add-status error';
    status.textContent = '⚠ Apps Script URL이 없어 시트에 저장되지 않았습니다 (화면에만 반영됨).';
    submitBtn.disabled = false;
    setTimeout(() => document.getElementById('add-backdrop').classList.remove('show'), 1200);
    return;
  }

  const payload = isEdit
    ? { action: 'updateItem', sheet: meta.sheet, match: _editMatch, row }
    : { action: 'addItem',    sheet: meta.sheet, row };

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let data = {};
    try { data = await res.json(); } catch(_) {}

    if (isEdit) {
      if (!data.updated) {
        status.className = 'add-status error';
        status.textContent = data.added === undefined && data.ok
          ? '⚠ 수정할 행을 못 찾았습니다 (Apps Script 재배포 또는 원본 변경 확인).'
          : '⚠ 수정 응답이 없습니다. Apps Script를 최신 apps-script.gs로 재배포하세요.';
        applyEditLocally(cat, _editIdx, row);
        submitBtn.disabled = false;
        return;
      }
      applyEditLocally(cat, _editIdx, row);
      status.className = 'add-status';
      status.textContent = '✓ 수정되었습니다';
    } else {
      if (!data.added) {
        status.className = 'add-status error';
        status.textContent = '⚠ 시트 추가 응답이 없습니다. Apps Script를 최신 apps-script.gs로 재배포하세요.';
        applyNewRowLocally(cat, row);
        submitBtn.disabled = false;
        return;
      }
      applyNewRowLocally(cat, row);
      status.className = 'add-status';
      status.textContent = '✓ 추가되었습니다';
    }
    setTimeout(() => document.getElementById('add-backdrop').classList.remove('show'), 800);
  } catch(e) {
    status.className = 'add-status error';
    status.textContent = '⚠ 저장 실패: ' + e.message + ' (화면에만 반영됨)';
    if (isEdit) applyEditLocally(cat, _editIdx, row);
    else applyNewRowLocally(cat, row);
    submitBtn.disabled = false;
  }
}

/* 새 행을 DATA에 추가하고 현재 화면을 다시 그림 */
function applyNewRowLocally(cat, row) {
  DATA[cat] = DATA[cat] || [];
  DATA[cat].push({ ...row });
  _refreshTimeline();
}

/* 기존 행 수정 반영 */
function applyEditLocally(cat, idx, row) {
  if (!DATA[cat] || !DATA[cat][idx]) return;
  DATA[cat][idx] = { ...DATA[cat][idx], ...row };
  _refreshTimeline();
}

/* 타임라인/마커 재구성 (현재 보기 유지) */
function _refreshTimeline() {
  renderAll();
  setActiveDayBtn();
  updateView();
  if (currentCat === 'food') { clearAllMarkers(); renderFoodMarkers(currentDay); }
  else if (currentCat !== 'favorites') { clearAllMarkers(); renderScheduleMarkers(currentDay); }
}

/* renderAll() 이후 currentDay 에 맞는 일자 버튼 활성화 복원 */
function setActiveDayBtn() {
  if (infoTabActive) return;
  document.querySelectorAll('.day-btn').forEach(b => {
    const num = b.querySelector('.d-num')?.textContent.trim();
    const match = (currentDay === 'all' && num === 'All') || (num == currentDay);
    b.classList.toggle('active', match);
  });
}
