/* ═══════════════════════════════════════════════════
   search.js — 전체 검색 (⌘K / Ctrl+K)
═══════════════════════════════════════════════════ */

function openSearch() {
  document.getElementById('search-backdrop').classList.add('show');
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch(e) {
  if (e && e.target !== document.getElementById('search-backdrop')) return;
  document.getElementById('search-backdrop').classList.remove('show');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-empty">검색어를 입력하세요</div>';
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') {
    document.getElementById('search-backdrop').classList.remove('show');
    document.getElementById('add-backdrop')?.classList.remove('show');
  }
});

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark class="sri-mark">$1</mark>');
}

function doSearch(q) {
  q = q.trim();
  const el = document.getElementById('search-results');
  if (!q) { el.innerHTML = '<div class="search-empty">검색어를 입력하세요</div>'; return; }

  const results = { schedule: [], food: [], tips: [] };
  DATA.schedule.forEach(r => {
    const text = [r.name, r.description, r.tags].join(' ');
    if (text.toLowerCase().includes(q.toLowerCase())) results.schedule.push(r);
  });
  DATA.food.forEach(r => {
    const text = [r.name, r.description].join(' ');
    if (text.toLowerCase().includes(q.toLowerCase())) results.food.push(r);
  });
  DATA.tips.forEach(r => {
    const text = [r.title, r.content].join(' ');
    if (text.toLowerCase().includes(q.toLowerCase())) results.tips.push(r);
  });

  const total = results.schedule.length + results.food.length + results.tips.length;
  if (!total) { el.innerHTML = `<div class="search-empty">검색 결과가 없습니다 — <strong>${q}</strong></div>`; return; }

  let html = '';
  if (results.schedule.length) {
    html += `<div class="search-section-header">📅 일정 (${results.schedule.length})</div>`;
    results.schedule.forEach(r => {
      const type = r.type || 'sight';
      const colors = {food:'#FAECE7',coffee:'#FAEEDA',sight:'#E6F1FB',shop:'#E1F5EE',activity:'#F3E8FD',hotel:'#E1F5EE',transit:'#F1EFE8'};
      const bg = colors[type] || '#F1EFE8';
      const id = scheduleCardId(r);
      html += `<div class="search-result-item" onclick="jumpToCard('${id}','schedule')">
        <div class="sri-icon" style="background:${bg}">${r.emoji||typeIconEmoji(type)}</div>
        <div style="flex:1;min-width:0">
          <div class="sri-day">Day ${r.day} · ${r.time||''}</div>
          <div class="sri-name">${highlight(r.name||'', q)}</div>
          <div class="sri-desc">${highlight((r.description||'').slice(0,60), q)}${r.description&&r.description.length>60?'…':''}</div>
        </div>
      </div>`;
    });
  }
  if (results.food.length) {
    html += `<div class="search-section-header">🍽️ 맛집 (${results.food.length})</div>`;
    results.food.forEach(r => {
      const id = foodCardId(r);
      html += `<div class="search-result-item" onclick="jumpToCard('${id}','food')">
        <div class="sri-icon" style="background:#FAECE7">${r.emoji||'🍽️'}</div>
        <div style="flex:1;min-width:0">
          <div class="sri-day">Day ${r.day}</div>
          <div class="sri-name">${highlight(r.name||'', q)}</div>
          <div class="sri-desc">${highlight((r.description||'').slice(0,60), q)}${r.description&&r.description.length>60?'…':''}</div>
        </div>
      </div>`;
    });
  }
  if (results.tips.length) {
    html += `<div class="search-section-header">💡 여행 팁 (${results.tips.length})</div>`;
    results.tips.forEach(r => {
      html += `<div class="search-result-item" onclick="jumpToTip(${r.day})">
        <div class="sri-icon" style="background:#FAEEDA">${r.icon||'💡'}</div>
        <div style="flex:1;min-width:0">
          <div class="sri-day">Day ${r.day}</div>
          <div class="sri-name">${highlight(r.title||'', q)}</div>
          <div class="sri-desc">${highlight((r.content||'').slice(0,60), q)}${r.content&&r.content.length>60?'…':''}</div>
        </div>
      </div>`;
    });
  }
  el.innerHTML = html;
}

function typeIconEmoji(type) {
  return {food:'🍽',coffee:'☕',sight:'📍',shop:'🛍',activity:'🎯',hotel:'🏨',transit:'🚌'}[type]||'📍';
}

function jumpToCard(id, cat) {
  document.getElementById('search-backdrop').classList.remove('show');
  const catBtn = [...document.querySelectorAll('#main-filter-bar .f-btn')].find(b => {
    if (cat === 'schedule') return b.textContent.trim().startsWith('전체');
    if (cat === 'food') return b.textContent.trim().startsWith('맛');
    return false;
  });
  if (catBtn) selectCat(cat, catBtn);
  const row = cat === 'food'
    ? DATA.food.find(r => foodCardId(r) === id)
    : DATA.schedule.find(r => scheduleCardId(r) === id);
  if (row) {
    const dayBtn = [...document.querySelectorAll('.day-btn')].find(b => b.querySelector('.d-num')?.textContent == row.day);
    if (dayBtn) selectDay(Number(row.day), dayBtn);
  }
  setTimeout(() => {
    const el = document.querySelector(`[data-card-id="${id}"]`);
    if (el) { el.scrollIntoView({behavior:'smooth', block:'center'}); el.classList.add('selected'); setTimeout(() => el.classList.remove('selected'), 1800); }
  }, 300);
}

function jumpToTip(day) {
  document.getElementById('search-backdrop').classList.remove('show');
  const tipsBtn = [...document.querySelectorAll('#main-filter-bar .f-btn')].find(b => b.textContent.includes('팁'));
  if (tipsBtn) selectCat('tips', tipsBtn);
  const dayBtn = [...document.querySelectorAll('.day-btn')].find(b => b.querySelector('.d-num')?.textContent == day);
  if (dayBtn) selectDay(Number(day), dayBtn);
}
