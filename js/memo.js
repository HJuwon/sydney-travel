/* ═══════════════════════════════════════════════════
   memo.js — 카드 메모 저장/불러오기 (Apps Script + localStorage)
═══════════════════════════════════════════════════ */

// debounce용 타이머 맵
const memoTimers = {};

async function syncMemoToSheet(id, val) {
  if (!GAS_URL) return; // URL 없으면 localStorage만
  const statusEl = document.getElementById(`memo-status-${id}`);
  if (statusEl) { statusEl.textContent = '저장 중...'; statusEl.className = 'memo-save-status saving'; }
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // GAS CORS: text/plain 필수
      body: JSON.stringify({ action: 'memo', id, memo: val })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (statusEl) { statusEl.textContent = '✓ 저장됨'; statusEl.className = 'memo-save-status saved'; }
    setTimeout(() => { if (statusEl) { statusEl.textContent = ''; statusEl.className = 'memo-save-status'; } }, 2000);
  } catch(e) {
    if (statusEl) { statusEl.textContent = '⚠ 시트 저장 실패 (로컬엔 저장됨)'; statusEl.className = 'memo-save-status error'; }
  }
}

async function loadMemosFromSheet() {
  if (!GAS_URL) return;
  try {
    const res = await fetch(GAS_URL + '?action=getAll');
    if (!res.ok) return;
    const data = await res.json();
    // 시트 데이터가 있으면 병합 (시트 우선)
    Object.assign(memoState, data);
    saveMemo();
    // 이미 렌더링된 textarea 업데이트
    Object.keys(data).forEach(id => {
      const ta = document.querySelector(`[data-card-id="${id}"] .memo-input`);
      if (ta && data[id]) ta.value = data[id];
    });
  } catch(e) {
    console.warn('시트 메모 불러오기 실패 (localStorage 사용):', e.message);
  }
}

function setGasUrl(url) {
  GAS_URL = url.trim();
  localStorage.setItem('sydGasUrl', GAS_URL);
  const input = document.getElementById('gas-url-input');
  if (input) input.value = GAS_URL;
  document.getElementById('gas-setup-banner')?.classList.remove('show');
  loadMemosFromSheet();
}

/* ── 카드용 메모 HTML & 핸들러 ── */
function memoHtml(id) {
  const val = memoState[id] || '';
  const hasMemo = val.trim().length > 0;
  return `
    <button class="memo-toggle" onclick="toggleMemoArea('${id}',event)">
      <span class="memo-dot${hasMemo?' show':''}"></span>
      ${hasMemo ? '📝 메모 보기' : '+ 메모 추가'}
    </button>
    <div class="memo-area${hasMemo?' show':''}" id="memo-area-${id}">
      <textarea class="memo-input" rows="2" placeholder="이 장소에 대한 메모를 남기세요..."
        oninput="saveMemoInput('${id}',this.value)">${val}</textarea>
      <div class="memo-save-status" id="memo-status-${id}"></div>
    </div>`;
}

function toggleMemoArea(id, e) {
  e && e.stopPropagation();
  const area = document.getElementById(`memo-area-${id}`);
  if (area) area.classList.toggle('show');
}

function saveMemoInput(id, val) {
  memoState[id] = val;
  saveMemo(); // 항상 localStorage에 먼저 저장

  // 카드 UI 업데이트
  const card = document.querySelector(`[data-card-id="${id}"]`);
  if (card) {
    const toggle = card.querySelector('.memo-toggle');
    if (toggle) {
      toggle.innerHTML = `<span class="memo-dot${val.trim().length>0?' show':''}"></span> ${val.trim().length>0?'📝 메모 보기':'+ 메모 추가'}`;
    }
  }

  // debounce: 1초 후 시트에 저장
  if (memoTimers[id]) clearTimeout(memoTimers[id]);
  memoTimers[id] = setTimeout(() => {
    syncMemoToSheet(id, val);
  }, 1000);
}
