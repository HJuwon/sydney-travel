/* ═══════════════════════════════════════════════════
   add.js — 앱 안에서 일정/맛집/팁/관광지 직접 추가
   ─────────────────────────────────────────────────
   입력값을 Apps Script(GAS_URL)로 POST하여 해당 시트에 행을 추가하고,
   화면에도 즉시 반영합니다. (GAS는 apps-script.gs 최신 코드로 배포 필요)
═══════════════════════════════════════════════════ */

// 카테고리별 입력 필드 정의 (key 는 시트의 헤더명과 정확히 일치해야 함)
const ADD_FIELDS = {
  schedule: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true },
    { key:'order', label:'순서',       type:'number', half:true },
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
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true },
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
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true },
    { key:'icon',  label:'아이콘 (이모지)', placeholder:'💡', half:true },
    { key:'title', label:'제목',        required:true },
    { key:'content', label:'내용',       type:'textarea' },
  ],
  sights: [
    { key:'day',   label:'Day (일차)', type:'number', required:true, half:true },
    { key:'icon',  label:'아이콘 (이모지)', placeholder:'📍', half:true },
    { key:'title', label:'제목',        required:true },
    { key:'description', label:'설명',   type:'textarea' },
  ],
};

const ADD_META = {
  schedule: { sheet:'schedule', title:'일정',   emoji:'📅' },
  food:     { sheet:'food',     title:'맛집',   emoji:'🍽️' },
  tips:     { sheet:'tips',     title:'여행 팁', emoji:'💡' },
  sights:   { sheet:'sights',   title:'관광지', emoji:'🗽' },
};

let _addCat = null;

function openAddModal(cat, day) {
  _addCat = cat;
  const meta = ADD_META[cat];
  const fields = ADD_FIELDS[cat];
  if (!meta || !fields) return;

  document.getElementById('add-modal-title').innerHTML = `${meta.emoji} <em>${meta.title}</em> 추가`;

  let html = '';
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.half && fields[i+1] && fields[i+1].half) {
      html += `<div class="add-field-row">${fieldHtml(f, day)}${fieldHtml(fields[i+1], day)}</div>`;
      i += 2;
    } else {
      html += fieldHtml(f, day);
      i += 1;
    }
  }
  document.getElementById('add-modal-body').innerHTML = html;

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

function fieldHtml(f, day) {
  const reqMark = f.required ? '<span class="req">*</span>' : '';
  const prefill = (f.key === 'day' && day !== undefined && day !== null) ? String(day) : '';
  let control;
  if (f.type === 'textarea') {
    control = `<textarea name="${f.key}" placeholder="${f.placeholder||''}"></textarea>`;
  } else if (f.type === 'select') {
    const opts = f.options.map(o => `<option value="${o}">${o}</option>`).join('');
    control = `<select name="${f.key}">${opts}</select>`;
  } else {
    const type = f.type === 'number' ? 'number' : 'text';
    control = `<input type="${type}" name="${f.key}" placeholder="${f.placeholder||''}" value="${prefill}">`;
  }
  return `<div class="add-field">
    <label class="add-field-label">${f.label}${reqMark}</label>
    ${control}
  </div>`;
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

  if (!GAS_URL) {
    // 시트 저장 불가 → 로컬에만 추가
    applyNewRowLocally(cat, row);
    status.className = 'add-status error';
    status.textContent = '⚠ Apps Script URL이 없어 시트에 저장되지 않았습니다 (화면에만 추가됨).';
    submitBtn.disabled = false;
    setTimeout(() => document.getElementById('add-backdrop').classList.remove('show'), 1200);
    return;
  }

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addItem', sheet: meta.sheet, row })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let data = {};
    try { data = await res.json(); } catch(_) {}

    if (!data.added) {
      // 구버전 GAS(메모만 처리)일 가능성
      status.className = 'add-status error';
      status.textContent = '⚠ 시트 추가 응답이 없습니다. Apps Script를 최신 apps-script.gs로 재배포하세요.';
      applyNewRowLocally(cat, row);
      submitBtn.disabled = false;
      return;
    }

    // 성공 → 화면 반영
    applyNewRowLocally(cat, row);
    status.className = 'add-status';
    status.textContent = '✓ 추가되었습니다';
    setTimeout(() => document.getElementById('add-backdrop').classList.remove('show'), 800);
  } catch(e) {
    status.className = 'add-status error';
    status.textContent = '⚠ 저장 실패: ' + e.message + ' (화면에만 추가됨)';
    applyNewRowLocally(cat, row);
    submitBtn.disabled = false;
  }
}

// 새 행을 DATA에 추가하고 현재 화면을 다시 그림
function applyNewRowLocally(cat, row) {
  DATA[cat] = DATA[cat] || [];
  DATA[cat].push({ ...row });

  renderAll();          // 타임라인/일자 버튼 재구성
  setActiveDayBtn();    // 활성 일자 버튼 복원
  updateView();         // 현재 카테고리/일자 보이기

  // 마커 갱신
  if (currentCat === 'food') { clearAllMarkers(); renderFoodMarkers(currentDay); }
  else if (currentCat !== 'favorites') { clearAllMarkers(); renderScheduleMarkers(currentDay); }
}

// renderAll() 이후 currentDay 에 맞는 일자 버튼 활성화 복원
function setActiveDayBtn() {
  if (infoTabActive) return;
  document.querySelectorAll('.day-btn').forEach(b => {
    const num = b.querySelector('.d-num')?.textContent.trim();
    const match = (currentDay === 'all' && num === 'All') || (num == currentDay);
    b.classList.toggle('active', match);
  });
}
