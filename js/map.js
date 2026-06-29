/* ═══════════════════════════════════════════════════
   map.js — Leaflet 지도, 마커, 경로선, 핀
═══════════════════════════════════════════════════ */

const dayColors = { 0:'#E74C3C', 1:'#1A6B5A', 2:'#D85A30', 3:'#378ADD', 4:'#9B59B6', 5:'#BA7517', 6:'#16A085', 7:'#34495E', 8:'#7F8C8D' };
const dayViews = {
  'all': { center:[-33.8500, 151.2100], zoom: 11 },
  0:    { center:[37.4602, 126.4407], zoom: 13 },
  1:    { center:[-33.8600, 151.2100], zoom: 14 },
  2:    { center:[-33.9060, 151.2680], zoom: 13 },
  3:    { center:[-33.8200, 151.2600], zoom: 13 },
  4:    { center:[-33.7353, 150.3113], zoom: 13 },
  5:    { center:[-33.8550, 151.2400], zoom: 13 },
  6:    { center:[-33.8730, 151.1990], zoom: 13 },
  7:    { center:[-33.8730, 151.2080], zoom: 13 },
  8:    { center:[-33.9399, 151.1753], zoom: 13 }
};

let map, scheduleMarkers = [], foodMarkers = [], activeMarker = null;
let currentDay = 'all', currentCat = 'schedule', currentTypeFilter = 'all';
let routeLines = [];
let showRoute = false;

function initMap() {
  if (map) { map.remove(); map = null; }
  map = L.map('leaflet-map', { zoomControl: true }).setView([-33.85, 151.21], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB © OSM', maxZoom: 19
  }).addTo(map);
  renderScheduleMarkers('all');
}

function makeIcon(color, size = 16, day = null) {
  const label = day !== null ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${size*0.55}px;line-height:1;color:#fff;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.35);pointer-events:none;user-select:none;">${day}</span>` : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;">${label}</div>`,
    iconSize:[size,size], iconAnchor:[size/2,size/2]
  });
}

function makePinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);"></div>`,
    iconSize:[34,34], iconAnchor:[17,34]
  });
}

function makeFoodIcon(emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:#D85A30;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.30);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;">${emoji}</div>`,
    iconSize:[32,32], iconAnchor:[16,16]
  });
}

function toggleRoute(btn) {
  showRoute = !showRoute;
  btn.classList.toggle('active', showRoute);
  if (showRoute) {
    drawRouteLines(currentDay);
  } else {
    routeLines.forEach(l => map.removeLayer(l));
    routeLines = [];
  }
}

function drawRouteLines(dayFilter) {
  routeLines.forEach(l => map.removeLayer(l));
  routeLines = [];

  const rows = DATA.schedule
    .filter(r => r.lat && r.lng && r.type !== 'transit')
    .filter(r => dayFilter === 'all' || Number(r.day) == dayFilter);

  if (dayFilter === 'all') {
    const days = [...new Set(rows.map(r => Number(r.day)))].sort((a,b) => a-b);
    days.forEach(day => {
      const dayRows = rows
        .filter(r => Number(r.day) === day)
        .sort((a,b) => Number(a.order||0) - Number(b.order||0));
      if (dayRows.length < 2) return;
      const coords = dayRows.map(r => [parseFloat(r.lat), parseFloat(r.lng)]);
      const color = dayColors[day] || '#1A6B5A';
      const line = L.polyline(coords, {
        color, weight: 2.5, opacity: 0.5, dashArray: '6, 6'
      }).addTo(map);
      routeLines.push(line);
    });
  } else {
    const dayRows = rows.sort((a,b) => Number(a.order||0) - Number(b.order||0));
    if (dayRows.length < 2) return;
    const coords = dayRows.map(r => [parseFloat(r.lat), parseFloat(r.lng)]);
    const color = dayColors[dayFilter] || '#1A6B5A';
    const line = L.polyline(coords, {
      color, weight: 3.5, opacity: 0.75, dashArray: '8, 5'
    }).addTo(map);
    routeLines.push(line);
  }
}

function renderScheduleMarkers(dayFilter) {
  scheduleMarkers.forEach(m => map.removeLayer(m)); scheduleMarkers = [];
  routeLines.forEach(l => map.removeLayer(l)); routeLines = [];

  const rows = DATA.schedule
    .filter(r => r.lat && r.lng && r.type !== 'transit')
    .filter(r => dayFilter === 'all' || Number(r.day) == dayFilter);

  rows.forEach(r => {
    const color = dayColors[r.day] || '#1A6B5A';
    const m = L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon: makeIcon(color, 26, r.day) })
      .addTo(map)
      .bindTooltip('[Day ' + r.day + '] ' + r.name, { direction:'top', offset:[0,-10] });
    m.on('click', () => showInfo(r.name, r.addr || ''));
    scheduleMarkers.push(m);
  });
}

function renderFoodMarkers(dayFilter) {
  foodMarkers.forEach(m => map.removeLayer(m)); foodMarkers = [];
  DATA.food
    .filter(r => r.lat && r.lng)
    .filter(r => dayFilter === 'all' || Number(r.day) == dayFilter)
    .forEach(r => {
      const m = L.marker([parseFloat(r.lat), parseFloat(r.lng)], { icon: makeFoodIcon(r.emoji||'🍽️') })
        .addTo(map)
        .bindTooltip('🍴 ' + r.name, { direction:'top', offset:[0,-14] });
      m.on('click', () => showInfo(r.name, r.addr || ''));
      foodMarkers.push(m);
    });
}

function clearAllMarkers() {
  scheduleMarkers.forEach(m => map.removeLayer(m)); scheduleMarkers = [];
  foodMarkers.forEach(m => map.removeLayer(m)); foodMarkers = [];
  routeLines.forEach(l => map.removeLayer(l)); routeLines = [];
}

function _pinMapCore(name, coords, addr, el) {
  if (el) el.classList.add('selected');
  if (map) {
    map.flyTo([coords.lat, coords.lng], 16, { duration: 0.85 });
    if (activeMarker) map.removeLayer(activeMarker);
    const col = dayColors[currentDay] || '#1A6B5A';
    activeMarker = L.marker([coords.lat, coords.lng], { icon: makePinIcon(col), zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(name, { permanent:false, direction:'top', offset:[0,-38] });
  }
  showInfo(name, addr);
}

function showInfo(name, addr) {
  document.getElementById('place-name').textContent = name;
  document.getElementById('place-addr').textContent = addr;
  document.getElementById('place-info').classList.add('show');
  const btn = document.getElementById('gmaps-btn');
  btn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+addr)}`;
  btn.classList.add('show');
}

function closePlace() {
  document.getElementById('place-info').classList.remove('show');
  document.getElementById('gmaps-btn').classList.remove('show');
  document.querySelectorAll('.stop-card, .food-card').forEach(c => c.classList.remove('selected'));
  if (activeMarker && map) { map.removeLayer(activeMarker); activeMarker = null; }
}

function pinMap(name, coords, addr, el) {
  if (isMobile() && !mapExpanded) {
    mapExpanded = true;
    const panel = document.getElementById('map-panel-el');
    panel.classList.remove('map-collapsed');
    updateToggleUI();
    applyTimelineOffset();
    setTimeout(() => { if (map) map.invalidateSize(); _pinMapCore(name, coords, addr, el); }, 300);
    return;
  }
  _pinMapCore(name, coords, addr, el);
}
