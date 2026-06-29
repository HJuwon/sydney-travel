/* ═══════════════════════════════════════════════════
   render.js — 카드/타임라인/찜 렌더링
═══════════════════════════════════════════════════ */

const typeIcons = {
  food:     `<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>`,
  coffee:   `<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>`,
  sight:    `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  shop:     `<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  transit:  `<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  activity: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  hotel:    `<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>`,
};

const tagClassMap = {
  '랜드마크':'sight','투어':'activity','점심':'food','하버뷰':'sight','공원':'sight',
  '무료':'tip','역사지구':'sight','맛집거리':'food','버킷리스트':'activity','저녁':'food',
  '맥주':'coffee','브런치':'food','해변':'activity','수영':'activity','트레킹':'activity',
  '트레일 종착':'tip','해변뷰':'sight','교통':'tip','동물원':'activity','선셋뷰':'sight',
  '쇼핑':'shop','카페':'coffee','야경':'sight','산책':'activity','건축':'sight',
  '쇼핑몰':'shop','투어버스':'activity','사전예약':'tip','전망대':'sight',
  '별보기':'activity','겨울 추천':'tip','그래피티':'sight','빈티지':'shop','미술관':'sight',
  '절경':'sight','포토스팟':'sight','씨푸드':'food','출국 준비':'tip','공항':'transit',
  '면세쇼핑':'shop','귀국':'tip','역사건물':'sight','케이블카':'activity',
  '숙소':'tip','펍':'food','해변산책':'activity','문화':'sight','교육':'sight','예술':'shop',
  '정원':'sight','해산물':'food','출국':'tip','비행':'activity',
};
function tagClass(tag) { return tagClassMap[tag] || 'tip'; }

const dayLabels = { 0:'출발', 1:'하버', 2:'본다이', 3:'맨리', 4:'블루산', 5:'왓슨', 6:'달링', 7:'마지막', 8:'귀국' };

function scheduleCardId(row) {
  return `sch_${row.day}_${(row.name||'').replace(/\s+/g,'_')}`;
}
function foodCardId(row) {
  return `food_${row.day}_${(row.name||'').replace(/\s+/g,'_')}`;
}

function favBtnHtml(id) {
  const active = favState[id] ? ' active' : '';
  const emoji  = favState[id] ? '❤️' : '🤍';
  return `<button class="fav-btn${active}" onclick="toggleFav('${id}',event)" title="찜하기">${emoji}</button>`;
}

const ADD_ICON = `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
function addBtnHtml(cat, day, label) {
  return `<button class="add-item-btn" onclick="openAddModal('${cat}',${day})">${ADD_ICON} ${label}</button>`;
}

/* ── 일정 렌더링 ── */
function renderSchedule(day) {
  const rows = DATA.schedule.filter(r => Number(r.day) === day);
  const dateStr = rows[0]?.date || '';
  const dayTitle = rows.find(r => r.title1 && r.title1.trim())?.title1?.trim() || `Day ${day}`;
  let html = `<div class="day-section visible" id="day-${day}" data-day="${day}">`;
  html += `<div class="cat-section visible" data-cat="schedule">`;
  html += `<div class="day-heading"><h2>Day ${day} · ${dayTitle}</h2><p>${dateStr}</p></div>`;
  rows.forEach((row) => {
    const type = (row.type || 'sight').trim();
    const icon = typeIcons[type] || typeIcons.sight;
    const tags = (row.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const tagHtml = tags.map(t => `<span class="sc-tag ${tagClass(t)}">${t}</span>`).join('');
    const hasCoords = row.lat && row.lng;
    const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
    const addr = row.addr || '';
    const name = row.name || '';
    const id = scheduleCardId(row);
    const pinCall = hasCoords ? `onclick="pinMap('${name.replace(/'/g,"\\'")}',{lat:${lat},lng:${lng}},'${addr.replace(/'/g,"\\'")}',this)"` : '';

    html += `<div class="stop-item" data-type="${type}">
      <div class="stop-dot type-${type}">${icon}</div>
      <div class="stop-card" data-card-id="${id}" ${pinCall}>
        ${favBtnHtml(id)}
        <div class="sc-time">${row.time || ''}</div>
        <div class="sc-name">${name}</div>
        <div class="sc-desc">${row.description || ''}</div>
        ${tagHtml ? `<div class="sc-tags">${tagHtml}</div>` : ''}
        ${memoHtml(id)}
      </div>
      ${row.transit_next ? `<div class="transit-row">
        <div class="transit-pill">${typeIcons.transit} ${row.transit_next}</div>
        <span class="transit-info">${row.transit_info || ''}</span>
      </div>` : ''}
    </div>`;
  });
  html += addBtnHtml('schedule', day, 'Day ' + day + ' 일정 추가');
  html += `</div>`;
  html += renderFoodSection(day);
  html += renderSightSection(day);
  html += renderTipsSection(day);
  html += `</div>`;
  return html;
}

function renderFoodSection(day) {
  const rows = DATA.food.filter(r => Number(r.day) === day);
  let html = `<div class="cat-section" data-cat="food">`;
  html += `<div class="day-heading"><h2>Day ${day} · 추천 맛집</h2></div>`;
  html += `<div class="food-grid">`;
  rows.forEach(r => {
    const hasCoords = r.lat && r.lng;
    const lat = parseFloat(r.lat), lng = parseFloat(r.lng);
    const addr = r.addr || '';
    const name = r.name || '';
    const id = foodCardId(r);
    const pinCall = hasCoords ? `onclick="pinMap('${name.replace(/'/g,"\\'")}',{lat:${lat},lng:${lng}},'${addr.replace(/'/g,"\\'")}',this)"` : '';
    const cursorStyle = hasCoords ? 'cursor:pointer;' : '';
    html += `<div class="food-card" data-card-id="${id}" ${pinCall} style="${cursorStyle}">
      ${favBtnHtml(id)}
      <div class="food-emoji" style="background:#${r.bg_color || 'F5F5F5'}">${r.emoji || '🍽️'}</div>
      <div class="food-body">
        <div class="food-name">${name}${hasCoords?'<span style="font-size:9px;color:#D85A30;font-weight:600;margin-left:3px;">📍</span>':''}</div>
        <div class="food-desc">${r.description || ''}</div>
        <div class="food-price">${r.price_level || ''}</div>
        ${memoHtml(id)}
      </div>
    </div>`;
  });
  html += `</div>`;
  html += addBtnHtml('food', day, 'Day ' + day + ' 맛집 추가');
  html += `</div>`;
  return html;
}

function renderSightSection(day) {
  const rows = DATA.sights.filter(r => Number(r.day) === day);
  let html = `<div class="cat-section" data-cat="sights">`;
  html += `<div class="day-heading"><h2>Day ${day} · 주요 관광지</h2></div>`;
  rows.forEach(r => {
    html += `<div class="sight-card">
      <div class="sight-icon">${r.icon || '📍'}</div>
      <div><div class="sight-title">${r.title}</div><div class="sight-text">${r.description || ''}</div></div>
    </div>`;
  });
  html += addBtnHtml('sights', day, 'Day ' + day + ' 관광지 추가');
  html += `</div>`;
  return html;
}

function renderTipsSection(day) {
  const rows = DATA.tips.filter(r => Number(r.day) === day);
  let html = `<div class="cat-section" data-cat="tips">`;
  html += `<div class="day-heading"><h2>Day ${day} · 여행 팁</h2></div>`;
  html += `<div class="tips-list">`;
  rows.forEach(r => {
    html += `<div class="tip-card">
      <div class="tip-icon">${r.icon || '💡'}</div>
      <div><div class="tip-title">${r.title}</div><div class="tip-text">${r.content || ''}</div></div>
    </div>`;
  });
  html += `</div>`;
  html += addBtnHtml('tips', day, 'Day ' + day + ' 팁 추가');
  html += `</div>`;
  return html;
}

/* ── 찜 목록 뷰 ── */
function renderFavoritesView() {
  const favIds = Object.keys(favState).filter(k => favState[k]);
  if (!favIds.length) {
    return `<div class="fav-empty"><div class="fe-icon">🤍</div><div style="font-weight:600;margin-bottom:4px;">찜한 장소가 없어요</div><div style="font-size:11px;color:var(--mid)">카드의 🤍 버튼을 눌러 찜해보세요</div></div>`;
  }
  let html = `<div class="day-heading"><h2>찜 목록 <span style="font-size:14px;color:var(--coral)">❤️ ${favIds.length}</span></h2></div>`;
  const schedFavs = DATA.schedule.filter(r => favState[scheduleCardId(r)]);
  if (schedFavs.length) {
    html += `<div style="font-size:11px;font-weight:600;color:var(--mid);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px">일정</div>`;
    schedFavs.forEach(row => {
      const id = scheduleCardId(row);
      const hasCoords = row.lat && row.lng;
      const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
      const addr = row.addr || '';
      const name = row.name || '';
      const pinCall = hasCoords ? `onclick="pinMap('${name.replace(/'/g,"\\'")}',{lat:${lat},lng:${lng}},'${addr.replace(/'/g,"\\'")}',this)"` : '';
      html += `<div class="stop-item" style="padding-left:14px">
        <div class="stop-card" data-card-id="${id}" ${pinCall}>
          ${favBtnHtml(id)}
          <div class="sc-time">Day ${row.day} · ${row.time||''}</div>
          <div class="sc-name">${name}</div>
          <div class="sc-desc">${row.description||''}</div>
          ${memoHtml(id)}
        </div>
      </div>`;
    });
  }
  const foodFavs = DATA.food.filter(r => favState[foodCardId(r)]);
  if (foodFavs.length) {
    html += `<div style="font-size:11px;font-weight:600;color:var(--mid);margin:12px 0 8px;text-transform:uppercase;letter-spacing:0.4px">맛집</div>`;
    html += `<div class="food-grid">`;
    foodFavs.forEach(r => {
      const id = foodCardId(r);
      const hasCoords = r.lat && r.lng;
      const lat = parseFloat(r.lat), lng = parseFloat(r.lng);
      const addr = r.addr || '';
      const name = r.name || '';
      const pinCall = hasCoords ? `onclick="pinMap('${name.replace(/'/g,"\\'")}',{lat:${lat},lng:${lng}},'${addr.replace(/'/g,"\\'")}',this)"` : '';
      html += `<div class="food-card" data-card-id="${id}" ${pinCall} style="cursor:pointer">
        ${favBtnHtml(id)}
        <div class="food-emoji" style="background:#${r.bg_color||'F5F5F5'}">${r.emoji||'🍽️'}</div>
        <div class="food-body">
          <div class="food-name">Day ${r.day} · ${name}</div>
          <div class="food-desc">${r.description||''}</div>
          <div class="food-price">${r.price_level||''}</div>
          ${memoHtml(id)}
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  return html;
}

/* Apps Script 설정 배너 HTML */
function renderGasBanner() {
  return `<div class="gas-setup-banner" id="gas-setup-banner">
    <strong>📝 메모/항목을 Google Sheets에 저장하려면</strong> Apps Script 웹앱 URL을 입력하세요.<br>
    설정 방법: <a href="#" onclick="showGasGuide();return false;">가이드 보기</a>
    <div class="gas-url-row">
      <input class="gas-url-input" id="gas-url-input" placeholder="https://script.google.com/macros/s/.../exec" value="${GAS_URL}">
      <button class="gas-url-btn" onclick="setGasUrl(document.getElementById('gas-url-input').value)">저장</button>
    </div>
  </div>`;
}

function showGasGuide() {
  alert(
    '📋 Apps Script 설정 가이드\n\n' +
    '1. script.google.com 접속 → 새 프로젝트\n' +
    '2. 저장소의 apps-script.gs 코드를 복사 붙여넣기\n' +
    '3. 배포 → 새 배포 → 웹앱 선택\n' +
    '4. 액세스: "모든 사용자" 설정\n' +
    '5. 배포 후 생성된 URL을 위 입력창에 입력\n\n' +
    '⚠ SHEET_ID는 현재 스프레드시트 ID로 교체하세요.'
  );
}

function renderDayButtons() {
  const days = getDays();
  let html = '';
  days.forEach(d => {
    const label = dayLabels[d] || `D${d}`;
    html += `<button class="day-btn" onclick="selectDay(${d},this)" title="Day ${d}">
      <span class="d-num">${d}</span>
      <span class="d-lbl">${label}</span>
    </button>`;
  });
  document.getElementById('day-buttons-container').innerHTML = html;
}

function renderAll() {
  renderDayButtons();
  const days = getDays();
  // Apps Script 배너 + 일정 내용
  let html = renderGasBanner();
  days.forEach(d => { html += renderSchedule(d); });
  document.getElementById('timeline-content').innerHTML = html;
}

/* ── 찜 토글 ── */
function toggleFav(id, e) {
  e && e.stopPropagation();
  favState[id] = !favState[id];
  saveFav();
  document.querySelectorAll(`.fav-btn`).forEach(btn => {
    const cardId = btn.closest('[data-card-id]')?.getAttribute('data-card-id');
    if (cardId === id) {
      btn.textContent = favState[id] ? '❤️' : '🤍';
      btn.classList.toggle('active', favState[id]);
    }
  });
  if (currentCat === 'favorites') {
    document.getElementById('timeline-content').innerHTML = renderFavoritesView();
  }
}
