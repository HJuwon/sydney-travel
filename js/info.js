/* ═══════════════════════════════════════════════════
   info.js — 정보 탭 (항공/환율/숙소/교통/예산/체크리스트)
═══════════════════════════════════════════════════ */

let currentInfoCat = 'flight';
let infoTabActive = false;

function getInfoBy(cat) { return DATA.info.filter(r => r.category === cat); }

function renderInfoContent(cat) {
  const rows = getInfoBy(cat);
  let html = '';
  if (cat === 'flight')         html += renderInfoCard('✈️', '항공편 정보', 'teal', rows);
  else if (cat === 'exchange')  html += renderExchangeCard(rows);
  else if (cat === 'hotel')     html += renderInfoCard('🏨', '숙소 정보', 'blue', rows);
  else if (cat === 'transport') html += renderInfoCard('🚌', '교통 정보', 'amber', rows);
  else if (cat === 'budget')    html += renderBudgetCard(rows);
  else if (cat === 'checklist') html += renderChecklistCard(rows);

  if (!rows.length && cat !== 'checklist' && cat !== 'budget') {
    html = `<div style="text-align:center;padding:40px 20px;color:var(--mid);">
      <div style="font-size:32px;margin-bottom:10px;">📭</div>
      <div style="font-size:13px;font-weight:500;">데이터가 없습니다</div>
      <div style="font-size:11px;margin-top:5px;opacity:0.7;">Google Sheets의 info 시트에 category: <strong>${cat}</strong> 데이터를 추가하세요</div>
    </div>`;
  }

  document.getElementById('info-content').innerHTML = html;
  if (cat === 'budget') {
    setTimeout(() => {
      document.querySelectorAll('.budget-item-bar[data-pct]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-pct') + '%';
      });
    }, 50);
  }
}

function renderInfoCard(iconEmoji, title, colorClass, rows) {
  if (!rows.length) return '';
  let html = `<div class="info-section"><div class="info-card">
    <div class="info-card-header ${colorClass}"><span class="ich-badge">${iconEmoji}</span>${title}</div>
    <div class="info-rows">`;
  rows.forEach(r => {
    const val = r.value || '';
    const isURL = val.startsWith('http://') || val.startsWith('https://');
    const valueHtml = isURL
      ? `<a href="${val}" target="_blank" rel="noopener" class="info-link">🔗 바로가기</a>`
      : val;
    html += `<div class="info-row">
      <div class="info-row-icon">${r.icon || ''}</div>
      <div class="info-row-text">
        <div class="info-row-label">${r.label || ''}</div>
        <div class="info-row-value">${valueHtml}</div>
      </div>
    </div>`;
  });
  html += `</div></div></div>`;
  return html;
}

function renderExchangeCard(rows) {
  if (!rows.length && !liveRate) return '';
  const rateRow = rows.find(r => r.label && r.label.includes('환율')) || rows[0];
  const calcRow = rows.find(r => r.label && r.label.includes('환전'));
  const liveRateStr = liveRate ? Math.round(liveRate).toLocaleString() + ' 원' : null;
  const displayRate = liveRateStr || (rateRow ? rateRow.value : '-');
  const liveBadge = liveRate ? `<span class="exchange-live-badge">실시간</span>` : '';

  let html = `<div class="info-section"><div class="info-card">
    <div class="info-card-header amber"><span class="ich-badge">💱</span>환율 정보${liveBadge}</div>
    <div class="exchange-big">
      <div class="exchange-rate-display">1 AUD = ${displayRate}</div>
      <div class="exchange-rate-sub">${liveRate ? '실시간 AUD → KRW 환율' : '현재 AUD → KRW 환율'}</div>
    </div>`;

  if (liveRate) {
    const amounts = [10, 50, 100, 500];
    html += `<div style="padding:10px 14px 4px">`;
    amounts.forEach(aud => {
      const krw = (liveRate * aud).toLocaleString('ko-KR', {maximumFractionDigits:0});
      html += `<div class="info-row" style="padding:8px 0;border-bottom:1px solid var(--gray-light)">
        <div class="info-row-icon">💵</div>
        <div class="info-row-text">
          <div class="info-row-label">AUD ${aud}</div>
          <div class="info-row-value">₩ ${krw}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  if (calcRow) {
    html += `<div class="exchange-calc">
      <div class="exchange-calc-label">💡 ${calcRow.label}</div>
      <div class="exchange-calc-val">${calcRow.value}</div>
    </div>`;
  }

  const others = rows.filter(r => r !== rateRow && r !== calcRow);
  if (others.length) {
    html += `<div class="info-rows">`;
    others.forEach(r => {
      html += `<div class="info-row">
        <div class="info-row-icon">${r.icon || ''}</div>
        <div class="info-row-text">
          <div class="info-row-label">${r.label || ''}</div>
          <div class="info-row-value">${r.value || ''}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderBudgetCard(rows) {
  if (!rows.length) return '';
  const totalRow = rows.find(r => r.label && (r.label.includes('합계') || r.label.includes('총')));
  const itemRows = rows.filter(r => r !== totalRow);
  function parseAmt(val) {
    if (!val) return 0;
    const m = val.replace(/,/g, '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  }
  const maxAmt = Math.max(...itemRows.map(r => parseAmt(r.value)), 1);
  const barColors = ['#1A6B5A','#378ADD','#D85A30','#BA7517','#9B59B6','#5F5E5A'];
  let html = `<div class="info-section"><div class="info-card">
    <div class="info-card-header coral"><span class="ich-badge">💰</span>여행 예산</div>
    <div class="budget-bar-wrap">`;
  if (totalRow) {
    html += `<div class="budget-total">
      <div class="budget-total-label">총 예산</div>
      <div class="budget-total-value">${totalRow.value}</div>
    </div>`;
  }
  html += `<div class="budget-items">`;
  itemRows.forEach((r, i) => {
    const amt = parseAmt(r.value);
    const pct = maxAmt > 0 ? Math.round((amt / maxAmt) * 100) : 0;
    html += `<div class="budget-item">
      <div class="budget-item-label">${r.icon || ''} ${r.label || ''}</div>
      <div class="budget-item-bar-wrap">
        <div class="budget-item-bar" data-pct="${pct}" style="background:${barColors[i % barColors.length]};width:0%"></div>
      </div>
      <div class="budget-item-val">${r.value}</div>
    </div>`;
  });
  html += `</div></div></div></div>`;
  return html;
}

function renderChecklistCard(rows) {
  rows.forEach((r, i) => {
    const key = `chk_${i}`;
    if (!(key in checklistState)) checklistState[key] = false;
  });
  const total = rows.length;
  const done = rows.filter((r, i) => checklistState[`chk_${i}`]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  let html = `<div class="info-section"><div class="info-card">
    <div class="info-card-header gray"><span class="ich-badge">📋</span>준비물 체크리스트</div>
    <div style="padding:10px 14px 4px;">
      <div class="checklist-progress">
        <div class="checklist-progress-bar-wrap">
          <div class="checklist-progress-bar" style="width:${pct}%"></div>
        </div>
        <div class="checklist-progress-label">${done}/${total}</div>
      </div>`;
  if (rows.length) {
    html += `<div class="checklist-grid">`;
    rows.forEach((r, i) => {
      const checked = checklistState[`chk_${i}`];
      html += `<div class="checklist-item${checked ? ' checked' : ''}" onclick="toggleCheck(${i})">
        <div class="checklist-check">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="checklist-icon">${r.icon || '📌'}</div>
        <div class="checklist-label">${r.title || r.label || r.value || ''}</div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div></div></div>`;
  return html;
}

function toggleCheck(idx) {
  const key = `chk_${idx}`;
  checklistState[key] = !checklistState[key];
  localStorage.setItem('checklistState', JSON.stringify(checklistState));
  renderInfoContent(currentInfoCat);
}

/* ── Info 탭 UI ── */
function selectInfoTab(btn) {
  infoTabActive = true;
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('main-filter-bar').style.display = 'none';
  document.getElementById('info-filter-bar').style.display = '';
  document.getElementById('type-filter-bar').classList.add('hidden');
  document.getElementById('place-info').classList.remove('show');
  document.getElementById('gmaps-btn').classList.remove('show');
  document.getElementById('timeline-panel').style.display = 'none';
  if (isMobile()) {
    document.getElementById('map-panel-el').style.display = 'none';
    const toggleBtn = document.getElementById('map-toggle-btn');
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    document.getElementById('map-panel-el').style.display = 'none';
  }
  document.getElementById('info-overlay').classList.add('show');
  selectInfoCat('flight', document.querySelector('#info-filter-bar .f-btn'));
}

function selectInfoCat(cat, btn) {
  currentInfoCat = cat;
  document.querySelectorAll('#info-filter-bar .f-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderInfoContent(cat);
}

function exitInfoTab() {
  infoTabActive = false;
  document.getElementById('main-filter-bar').style.display = '';
  document.getElementById('info-filter-bar').style.display = 'none';
  document.getElementById('info-overlay').classList.remove('show');
  document.getElementById('timeline-panel').style.display = '';
  if (currentCat === 'schedule') document.getElementById('type-filter-bar').classList.remove('hidden');
  if (isMobile()) {
    document.getElementById('map-panel-el').style.display = '';
    const toggleBtn = document.getElementById('map-toggle-btn');
    if (toggleBtn) toggleBtn.style.display = '';
    applyTimelineOffset();
    setTimeout(() => { if (map) map.invalidateSize(); }, 50);
  } else {
    document.getElementById('map-panel-el').style.display = '';
    setTimeout(() => { if (map) map.invalidateSize(); }, 50);
  }
}
