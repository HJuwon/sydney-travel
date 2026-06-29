/* ═══════════════════════════════════════════════════
   config.js — 전역 설정
   ─────────────────────────────────────────────────
   • SHEET_ID  : Google Sheets 문서 ID
   • SHEET_NAMES: 불러올 시트(탭) 이름 목록
   • GAS_URL   : Apps Script 웹앱 URL (메모 저장 + 항목 추가)
                 비어있으면 localStorage에만 저장됩니다.
═══════════════════════════════════════════════════ */

const SHEET_ID = '1A5YDClkB7E2IlULZU3SMbgy20qIZo21Jphj-fyqAV6o';
const SHEET_NAMES = ['schedule', 'food', 'tips', 'sights', 'info'];

// Apps Script 웹앱 URL (localStorage 값이 있으면 우선)
let GAS_URL = localStorage.getItem('sydGasUrl') ||
  'https://script.google.com/macros/s/AKfycbyILklVemSDLwbZM1mL7rBz-qMu7Ad8pqfl46ZhbLaesEiFjYwSax-lhJJBp7pkapjL/exec';
