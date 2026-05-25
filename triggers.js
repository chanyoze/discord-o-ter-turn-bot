// 채팅 트리거 감지.
//  - 키워드 "바로 뒤에 물음표(?)"가 있어야만 동작합니다.
//    (문장 속에 키워드가 박혀 있어도 ?가 없으면 무시 → 오작동 방지)
//  - "코발트?" → 4명 모집
//  - "오터턴? / 이터널리턴? / 이리샥? / 블석? / 이리? / 이턴?" → 3명 모집

const KW_4 = ['코발트'];
const KW_3 = ['오터턴', '이터널리턴', '이리샥', '블석', '이리', '이턴'];

// 키워드 바로 뒤(공백 허용)에 물음표(? 또는 ？)가 와야 매칭
function hit(content, kw) {
  return new RegExp(`${kw}\\s*[?？]`).test(content);
}

// 매칭되면 { mode, size }, 아니면 null
export function detectTrigger(content) {
  if (KW_4.some((k) => hit(content, k))) return { mode: '코발트', size: 4 };
  if (KW_3.some((k) => hit(content, k))) return { mode: '이터널리턴', size: 3 };
  return null;
}
