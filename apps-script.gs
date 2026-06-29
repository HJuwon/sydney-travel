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
