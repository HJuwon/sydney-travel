/* ═══════════════════════════════════════════════════
   sort.js — 일정 카드 드래그로 순서 변경 (마우스/터치 공용)
   ─────────────────────────────────────────────────
   • 같은 Day 안에서만 순서 변경 (다른 Day 로는 이동 불가)
   • 변경 즉시 화면 + 메모리(DATA.schedule) 반영
   • 시트에는 reorderDay 액션으로 저장 (apps-script.gs 재배포 필요)
═══════════════════════════════════════════════════ */

let _drag = null;

/* 한 cat-section(=하루 일정) 안의 일정 카드들 */
function _scheduleItemsOf(section) {
  return Array.from(section.querySelectorAll(':scope > .stop-item'));
}

/* 핸들에서 포인터 다운 → 드래그 시작 */
function startCardDrag(e, handle) {
  // 카드 클릭(지도 핀)·스크롤과 충돌 방지
  e.preventDefault();
  e.stopPropagation();
  // 유형 필터가 걸려 일부 카드가 숨겨져 있으면 순서 계산이 틀어지므로 막는다
  if (typeof currentTypeFilter !== 'undefined' && currentTypeFilter !== 'all') {
    showReorderToast('순서 변경은 유형필터 "전체"에서만 가능합니다', true);
    return;
  }
  const item = handle.closest('.stop-item');
  if (!item) return;
  const section = item.parentElement;            // .cat-section[data-cat=schedule]
  const daySection = item.closest('.day-section');
  const day = item.getAttribute('data-day') || (daySection && daySection.getAttribute('data-day'));

  _drag = { item, section, day, moved: false };
  item.classList.add('dragging');
  document.body.classList.add('dragging-active');

  try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  document.addEventListener('pointermove', onCardDragMove, { passive: false });
  document.addEventListener('pointerup', onCardDragEnd, { passive: false });
  document.addEventListener('pointercancel', onCardDragEnd, { passive: false });
}

function onCardDragMove(e) {
  if (!_drag) return;
  e.preventDefault();
  _drag.moved = true;
  const y = e.clientY;
  const others = _scheduleItemsOf(_drag.section).filter(it => it !== _drag.item);

  let placedBefore = null;
  for (const other of others) {
    const rect = other.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) { placedBefore = other; break; }
  }
  if (placedBefore) {
    _drag.section.insertBefore(_drag.item, placedBefore);
  } else {
    // 맨 끝으로 (단, 'Day N 일정 추가' 버튼보다는 앞에)
    const addBtn = _drag.section.querySelector(':scope > .add-item-btn');
    if (addBtn) _drag.section.insertBefore(_drag.item, addBtn);
    else _drag.section.appendChild(_drag.item);
  }
}

function onCardDragEnd() {
  if (!_drag) return;
  document.removeEventListener('pointermove', onCardDragMove);
  document.removeEventListener('pointerup', onCardDragEnd);
  document.removeEventListener('pointercancel', onCardDragEnd);

  const { item, section, day, moved } = _drag;
  item.classList.remove('dragging');
  document.body.classList.remove('dragging-active');
  _drag = null;
  if (!moved) return;

  // 새 DOM 순서 → 기존 상대 인덱스(data-rel) 배열 = 순열
  const perm = _scheduleItemsOf(section).map(it => Number(it.getAttribute('data-rel')));
  const unchanged = perm.every((v, i) => v === i);
  if (unchanged) return;

  reorderScheduleDayLocal(day, perm);   // 메모리 반영
  _refreshTimeline();                   // 화면 다시 그림 (data-rel 재설정)
  persistReorder('schedule', day, perm); // 시트 저장
}

/* DATA.schedule 안에서 해당 Day 행들을 순열대로 재배치 (다른 Day 는 그대로) */
function reorderScheduleDayLocal(day, perm) {
  const slots = [];
  DATA.schedule.forEach((r, i) => { if (Number(r.day) === Number(day)) slots.push(i); });
  if (slots.length !== perm.length) return;   // 정합성 안 맞으면 중단
  const objs = slots.map(i => DATA.schedule[i]);
  const newObjs = perm.map(p => objs[p]);
  slots.forEach((slotIdx, i) => { DATA.schedule[slotIdx] = newObjs[i]; });
}

/* 시트에 순서 저장 */
async function persistReorder(sheet, day, order) {
  if (!GAS_URL) {
    showReorderToast('⚠ Apps Script URL 미설정 — 화면에만 반영됨', true);
    return;
  }
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'reorderDay', sheet, day: Number(day), order })
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (data.reordered) {
      showReorderToast('✓ 순서가 저장되었습니다');
    } else {
      showReorderToast('⚠ 순서 저장 실패 (Apps Script 재배포 확인)', true);
    }
  } catch (e) {
    showReorderToast('⚠ 순서 저장 실패: ' + e.message + ' (화면에만 반영됨)', true);
  }
}

/* 짧은 토스트 메시지 */
let _toastTimer = null;
function showReorderToast(msg, isErr) {
  let el = document.getElementById('reorder-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'reorder-toast';
    el.className = 'reorder-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle('err', !!isErr);
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
