/* ═══════════════════════════════════════════════════
   ui.js — 다크모드 / 시계 / 날씨 / 환율 / 필터 / 모바일 토글
═══════════════════════════════════════════════════ */

/* ── 다크모드 ── */
function initDarkMode() {
  const saved = localStorage.getItem('sydTheme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateDarkIcon(true);
  }
}
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('sydTheme', 'light');
    updateDarkIcon(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('sydTheme', 'dark');
    updateDarkIcon(true);
  }
}
function updateDarkIcon(isDark) {
  const btn = document.getElementById('dark-toggle-btn');
  if (!btn) return;
  btn.innerHTML = isDark
    ? `<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg viewBox="0 0 24 24" style="width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

/* ── 시드니 현지 시간 ── */
function startSydneyClock() {
  function tick() {
    const now = new Date();
    const syd = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Australia/Sydney',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(now);
    const el = document.getElementById('sydney-time-text');
    if (el) el.textContent = syd;
  }
  tick();
  setInterval(tick, 1000);
}

/* ── 날씨 ── */
const WMO_ICON = {
  0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️',
  45:'🌫', 48:'🌫',
  51:'🌦', 53:'🌧', 55:'🌧',
  61:'🌧', 63:'🌧', 65:'🌧',
  71:'❄️', 73:'❄️', 75:'❄️',
  80:'🌦', 81:'🌧', 82:'⛈',
  95:'⛈', 96:'⛈', 99:'⛈'
};
function wmoIcon(code) { return WMO_ICON[code] || '🌤'; }
const DAYS_KO = ['일','월','화','수','목','금','토'];

async function fetchWeather() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-33.8688&longitude=151.2093&current=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Australia%2FSydney&forecast_days=7';
    const res = await fetch(url);
    const d = await res.json();
    const cur = d.current;
    document.getElementById('weather-icon-now').textContent = wmoIcon(cur.weathercode);
    document.getElementById('weather-temp-now').textContent = Math.round(cur.temperature_2m) + '°C';
    const daily = d.daily;
    let html = '';
    for (let i = 0; i < 7; i++) {
      const dt = new Date(daily.time[i]);
      const dow = DAYS_KO[dt.getDay()];
      const icon = wmoIcon(daily.weathercode[i]);
      const hi = Math.round(daily.temperature_2m_max[i]);
      const lo = Math.round(daily.temperature_2m_min[i]);
      html += `<div class="weather-day-card">
        <div style="font-size:10px;color:var(--mid)">${dow}</div>
        <div class="wd-icon">${icon}</div>
        <div class="wd-temp">${hi}°</div>
        <div class="wd-date" style="color:var(--mid)">${lo}°</div>
      </div>`;
    }
    document.getElementById('weather-days-row').innerHTML = html;
  } catch(e) {
    document.getElementById('weather-icon-now').textContent = '🌤';
    document.getElementById('weather-temp-now').textContent = '--°C';
  }
}

function toggleWeatherPopup(e) {
  e.stopPropagation();
  document.getElementById('weather-popup').classList.toggle('show');
}
document.addEventListener('click', () => {
  document.getElementById('weather-popup')?.classList.remove('show');
});

/* ── 실시간 환율 ── */
let liveRate = null;
async function fetchLiveRate() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/AUD');
    const d = await res.json();
    liveRate = d.rates && d.rates.KRW ? d.rates.KRW : null;
  } catch(e) {
    try {
      const res2 = await fetch('https://open.er-api.com/v6/latest/AUD');
      const d2 = await res2.json();
      liveRate = d2.rates && d2.rates.KRW ? d2.rates.KRW : null;
    } catch(e2) { liveRate = null; }
  }
}

/* ── 일자 / 카테고리 / 타입 필터 ── */
function selectDay(day, btn) {
  if (infoTabActive) exitInfoTab();
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('info-day-btn').classList.remove('active');
  btn.classList.add('active');
  currentDay = day;
  closePlace();
  if (showRoute) drawRouteLines(day);
  const v = dayViews[day] || dayViews['all'];
  if (map) map.flyTo(v.center, v.zoom, { duration: 1.0 });
  if (currentCat === 'food') renderFoodMarkers(day);
  else renderScheduleMarkers(day);
  updateView();
}

function selectCat(cat, btn) {
  document.querySelectorAll('#main-filter-bar .f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const prevCat = currentCat;
  currentCat = cat;
  closePlace();

  if (prevCat === 'favorites' && cat !== 'favorites') {
    renderAll();
  }

  const typeBar = document.getElementById('type-filter-bar');
  if (cat === 'schedule') typeBar.classList.remove('hidden');
  else typeBar.classList.add('hidden');

  if (cat === 'food') {
    clearAllMarkers(); renderFoodMarkers(currentDay);
    if (foodMarkers.length) {
      const group = L.featureGroup(foodMarkers);
      map.fitBounds(group.getBounds().pad(0.25), { duration: 0.8 });
    }
  } else if (cat === 'favorites') {
    clearAllMarkers();
    const favIds = Object.keys(favState).filter(k => favState[k]);
    DATA.schedule.filter(r => favIds.includes(scheduleCardId(r)) && r.lat && r.lng).forEach(r => {
      const m = L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon: makeIcon('#D85A30', 26, r.day) }).addTo(map);
      m.on('click', () => showInfo(r.name, r.addr||''));
      scheduleMarkers.push(m);
    });
  } else {
    clearAllMarkers(); renderScheduleMarkers(currentDay);
  }
  updateView();
}

function selectTypeFilter(type, btn) {
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  currentTypeFilter = type;
  applyTypeFilter();
}

function applyTypeFilter() {
  document.querySelectorAll('.stop-item[data-type]').forEach(item => {
    const t = item.getAttribute('data-type');
    if (currentTypeFilter === 'all' || t === currentTypeFilter) {
      item.classList.remove('type-hidden');
    } else {
      item.classList.add('type-hidden');
    }
  });
}

function updateView() {
  if (currentCat === 'favorites') {
    document.getElementById('timeline-content').innerHTML = renderFavoritesView();
    return;
  }
  document.querySelectorAll('.day-section').forEach(ds => {
    const dayId = ds.getAttribute('data-day');
    const show = (currentDay === 'all' || currentDay == dayId);
    ds.classList.toggle('visible', show);
    if (show) {
      ds.querySelectorAll('.cat-section').forEach(cs => {
        cs.classList.toggle('visible', cs.getAttribute('data-cat') === currentCat);
      });
    }
  });
  if (currentCat === 'schedule') applyTypeFilter();
}

/* ── 모바일 지도 토글 ── */
const PX = { sidebar:44, topbar:44, filter:38, typeFilter:34, map:200, toggle:32 };
const TOP = {
  map:               PX.sidebar + PX.topbar + PX.filter + PX.typeFilter,
  toggle:            PX.sidebar + PX.topbar + PX.filter + PX.typeFilter + PX.map,
  timeline:          PX.sidebar + PX.topbar + PX.filter + PX.typeFilter + PX.map + PX.toggle,
  toggleCollapsed:   PX.sidebar + PX.topbar + PX.filter + PX.typeFilter,
  timelineCollapsed: PX.sidebar + PX.topbar + PX.filter + PX.typeFilter + PX.toggle,
};

let mapExpanded = true;
function isMobile() { return window.innerWidth <= 768; }

function applyTimelineOffset() {
  if (!isMobile()) return;
  const tl  = document.getElementById('timeline-panel');
  const btn = document.getElementById('map-toggle-btn');
  if (tl)  tl.style.top  = (mapExpanded ? TOP.timeline  : TOP.timelineCollapsed) + 'px';
  if (btn) btn.style.top = (mapExpanded ? TOP.toggle     : TOP.toggleCollapsed)   + 'px';
}

function updateToggleUI() {
  const btn  = document.getElementById('map-toggle-btn');
  const pill = document.getElementById('map-toggle-pill');
  if (!btn) return;
  btn.classList.toggle('collapsed', !mapExpanded);
  if (pill) pill.textContent = mapExpanded ? '접기' : '지도 보기';
}

function toggleMap() {
  mapExpanded = !mapExpanded;
  const panel = document.getElementById('map-panel-el');
  if (mapExpanded) {
    panel.classList.remove('map-collapsed');
    setTimeout(() => { if (map) map.invalidateSize(); }, 290);
  } else {
    panel.classList.add('map-collapsed');
  }
  updateToggleUI();
  applyTimelineOffset();
}

function initMobile() {
  setTimeout(() => { if (map) map.invalidateSize(); }, 50);
  if (isMobile()) {
    applyTimelineOffset();
    updateToggleUI();
  } else {
    const tl  = document.getElementById('timeline-panel');
    const btn = document.getElementById('map-toggle-btn');
    if (tl)  tl.style.top  = '';
    if (btn) btn.style.top = '';
  }
}

window.addEventListener('resize', initMobile);
