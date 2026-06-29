/* ═══════════════════════════════════════════════════════════════
   Sydney Travel Plan — Google Apps Script 웹앱
   ───────────────────────────────────────────────────────────────
   기능
     1) 카드 메모 저장/불러오기  (memos 시트)
     2) 일정/맛집/팁/관광지 항목 추가  (해당 시트에 행 append)

   배포 방법
     1. script.google.com → 새 프로젝트
     2. 이 파일 내용 전체를 붙여넣기
     3. SHEET_ID 를 본인 스프레드시트 ID로 확인/교체
     4. 배포 → 새 배포 → 유형: 웹앱
        - 실행: 나(소유자)
        - 액세스 권한: 모든 사용자
     5. 생성된 /exec URL 을 config.js 의 GAS_URL 에 입력
        (또는 앱 상단 배너의 입력창에 붙여넣기)

   ⚠ 코드를 수정/재배포할 때는 반드시 "배포 관리 → 편집 → 새 버전"으로
      배포해야 변경사항이 반영됩니다.
═══════════════════════════════════════════════════════════════ */

const SHEET_ID = '1A5YDClkB7E2IlULZU3SMbgy20qIZo21Jphj-fyqAV6o';

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const action = data.action || 'memo';

    if (action === 'addItem') {
      return addItem(ss, data);
    }
    if (action === 'updateItem') {
      return updateItem(ss, data);
    }
    if (action === 'reorderDay') {
      return reorderDay(ss, data);
    }
    // 기본: 메모 저장 (구버전 호환)
    return saveMemo(ss, data);
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('memos');
  if (!sheet) return _json({});
  const rows = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) result[rows[i][0]] = rows[i][1];
  }
  return _json(result);
}

/* ── 메모 저장 ── */
function saveMemo(ss, data) {
  let sheet = ss.getSheetByName('memos');
  if (!sheet) {
    sheet = ss.insertSheet('memos');
    sheet.appendRow(['id', 'memo', 'updated']);
  }
  const rows = sheet.getDataRange().getValues();
  let found = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) { found = i + 1; break; }
  }
  const now = new Date().toISOString();
  if (found > 0) {
    sheet.getRange(found, 2, 1, 2).setValues([[data.memo, now]]);
  } else {
    sheet.appendRow([data.id, data.memo, now]);
  }
  return _json({ ok: true });
}

/* ── 항목 추가 (시트 헤더에 맞춰 행 append) ── */
function addItem(ss, data) {
  const sheetName = data.sheet;                 // 'schedule' | 'food' | 'tips' | 'sights'
  const incoming = data.row || {};
  const allowed = ['schedule', 'food', 'tips', 'sights'];
  if (allowed.indexOf(sheetName) === -1) {
    return _json({ ok: false, error: 'invalid sheet: ' + sheetName });
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return _json({ ok: false, error: 'sheet not found: ' + sheetName });
  }
  // 첫 행(헤더)을 읽어 컬럼 순서대로 값 매핑
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  const newRow = headers.map(function (h) {
    return (incoming[h] !== undefined && incoming[h] !== null) ? incoming[h] : '';
  });
  sheet.appendRow(newRow);
  return _json({ ok: true, added: true, sheet: sheetName });
}

/* ── 항목 수정 (match 로 행을 찾아 row 값으로 덮어씀) ── */
function updateItem(ss, data) {
  const sheetName = data.sheet;
  const incoming = data.row || {};
  const match = data.match || {};
  const allowed = ['schedule', 'food', 'tips', 'sights'];
  if (allowed.indexOf(sheetName) === -1) {
    return _json({ ok: false, error: 'invalid sheet: ' + sheetName });
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return _json({ ok: false, error: 'sheet not found: ' + sheetName });
  }
  const range   = sheet.getDataRange();
  const values  = range.getValues();         // 원본 타입 보존 (쓰기용)
  const display = range.getDisplayValues();  // 화면 표시 문자열 (매칭용 — CSV와 동일)
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const matchKeys = Object.keys(match);

  for (var r = 1; r < values.length; r++) {
    var ok = true;
    for (var k = 0; k < matchKeys.length; k++) {
      var col = headers.indexOf(matchKeys[k]);
      // 시간/숫자 등 서식이 적용된 셀은 getValues()가 Date/number를 돌려주므로
      // 클라이언트(CSV 표시값)와 비교하려면 getDisplayValues()를 써야 한다.
      if (col === -1 || String(display[r][col]).trim() !== String(match[matchKeys[k]]).trim()) {
        ok = false; break;
      }
    }
    if (!ok) continue;
    // 일치하는 행 발견 → incoming 에 있는 헤더만 덮어쓰기
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (incoming[h] !== undefined && incoming[h] !== null) {
        values[r][c] = incoming[h];
      }
    }
    sheet.getRange(r + 1, 1, 1, headers.length).setValues([values[r]]);
    return _json({ ok: true, updated: true, sheet: sheetName, row: r + 1 });
  }
  return _json({ ok: true, updated: false, error: 'matching row not found' });
}

/* ── 같은 Day 내 순서 변경 (행 '내용'을 새 순서대로 물리 행에 다시 기록) ──
   data.order : 해당 Day 행들의 '기존 상대 인덱스'를 새 순서로 나열한 순열
                예) 3개 행이 [A,B,C] 인데 [A,C,B] 로 바꾸려면 order = [0,2,1] */
function reorderDay(ss, data) {
  const sheetName = data.sheet;
  const day = data.day;
  const order = data.order || [];
  const allowed = ['schedule', 'food', 'tips', 'sights'];
  if (allowed.indexOf(sheetName) === -1) {
    return _json({ ok: false, error: 'invalid sheet: ' + sheetName });
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return _json({ ok: false, error: 'sheet not found: ' + sheetName });
  }
  const range = sheet.getDataRange();
  const values = range.getValues();   // 원본 타입(Date 등) 그대로 읽어 그대로 다시 씀 → 손상 없음
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const dayCol = headers.indexOf('day');
  if (dayCol === -1) {
    return _json({ ok: false, reordered: false, error: 'no day column' });
  }
  // 해당 Day 의 물리 행을 시트 순서대로 수집
  const dayRows = [];   // { rowNum: 1-based, vals: [...] }
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][dayCol]).trim() === String(day).trim()) {
      dayRows.push({ rowNum: r + 1, vals: values[r] });
    }
  }
  // 순열 검증 (길이 + 0..n-1 중복 없는지)
  if (order.length !== dayRows.length) {
    return _json({ ok: false, reordered: false, error: 'order length mismatch',
      expected: dayRows.length, got: order.length });
  }
  var seen = {};
  for (var i = 0; i < order.length; i++) {
    var p = Number(order[i]);
    if (isNaN(p) || p < 0 || p >= dayRows.length || seen[p]) {
      return _json({ ok: false, reordered: false, error: 'invalid order permutation' });
    }
    seen[p] = true;
  }
  // 새 순서대로 내용을 같은 물리 행 슬롯에 다시 기록
  var newVals = order.map(function (origIdx) { return dayRows[origIdx].vals; });
  for (var j = 0; j < dayRows.length; j++) {
    sheet.getRange(dayRows[j].rowNum, 1, 1, headers.length).setValues([newVals[j]]);
  }
  return _json({ ok: true, reordered: true, sheet: sheetName, day: day, count: dayRows.length });
}
