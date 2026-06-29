/* ═══════════════════════════════════════════════════
   data.js — 데이터 상태 + CSV 로드 + 부팅 오케스트레이션
═══════════════════════════════════════════════════ */

let DATA = { schedule: [], food: [], tips: [], sights: [], info: [] };

let favState       = JSON.parse(localStorage.getItem('sydFav')         || '{}');
let memoState      = JSON.parse(localStorage.getItem('sydMemo')        || '{}');
let checklistState = JSON.parse(localStorage.getItem('checklistState') || '{}');

function saveFav()  { localStorage.setItem('sydFav',  JSON.stringify(favState)); }
function saveMemo() { localStorage.setItem('sydMemo', JSON.stringify(memoState)); }

function getDays() {
  return [...new Set(DATA.schedule.map(r => Number(r.day)))].sort((a, b) => a - b);
}

/* ── CSV 파서 ── */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], cur = '', inQ = false, i = 0;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i+1] === '"') { cur += '"'; i += 2; continue; } inQ = false; i++; continue; }
      cur += c; i++; continue;
    } else {
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(cur); cur = ''; i++; continue; }
      if (c === '\r') {
        if (text[i+1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = []; i++; continue;
      }
      if (c === '\n') { row.push(cur); cur = ''; rows.push(row); row = []; i++; continue; }
      cur += c; i++; continue;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const filtered = rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
  if (filtered.length < 2) return [];
  const headers = filtered[0].map(h => h.trim());
  const result = [];
  for (let r = 1; r < filtered.length; r++) {
    const vals = filtered[r];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
    result.push(obj);
  }
  return result;
}

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`시트 "${sheetName}" 로드 실패 (${resp.status})`);
  const buf = await resp.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buf);
  return parseCSV(text);
}

function setLoadingMsg(msg) { document.getElementById('loading-msg').textContent = msg; }
function setLoadingBar(pct) { document.getElementById('loading-bar').style.width = pct + '%'; }

/* ── 부팅 ── */
window.addEventListener('load', async () => {
  setLoadingBar(10);
  setLoadingMsg('Google Sheets에서 데이터 불러오는 중...');
  try {
    const total = SHEET_NAMES.length;
    for (let i = 0; i < total; i++) {
      const name = SHEET_NAMES[i];
      setLoadingMsg(`시트 로딩 중: ${name} (${i+1}/${total})`);
      setLoadingBar(10 + Math.round((i / total) * 65));
      try { DATA[name] = await fetchSheet(name); }
      catch(e) { console.warn(`시트 "${name}" 로드 건너뜀:`, e.message); DATA[name] = []; }
    }
    setLoadingBar(80);
    setLoadingMsg('화면 구성 중...');
    setTimeout(() => {
      renderAll();
      initMap();
      setLoadingBar(100);
      setLoadingMsg('완료!');
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app').style.display = '';
        setTimeout(async () => {
          document.getElementById('loading-screen').style.display = 'none';
          initMobile();
          initDarkMode();
          startSydneyClock();
          fetchWeather();
          fetchLiveRate();
          // Apps Script URL이 있으면 시트 메모 불러오기
          await loadMemosFromSheet();
          // GAS URL 미설정 시 배너 표시
          if (!GAS_URL) {
            document.getElementById('gas-setup-banner')?.classList.add('show');
          }
        }, 400);
      }, 300);
    }, 50);
  } catch(err) {
    setLoadingMsg('❌ 로드 오류: ' + err.message);
    console.error(err);
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
      setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('fz-error-msg').textContent = '오류: ' + err.message;
        document.getElementById('file-zone').classList.add('show');
      }, 400);
    }, 1500);
  }
});
