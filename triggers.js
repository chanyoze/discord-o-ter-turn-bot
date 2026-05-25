// 채팅 트리거 감지.
//  - "코발트"  → 4명 모집
//  - 그 외(오터턴/이터널리턴/이리샥) → 3명 모집
//  - 짧은 줄임말(이리/이턴)은 일상어 오인을 막기 위해, 단독이거나
//    물음표·모집성 단어가 붙었을 때만 반응합니다.

const STRONG_4 = ['코발트'];
const STRONG_3 = ['오터턴', '이터널리턴', '이리샥'];
const WEAK_3 = ['이리', '이턴'];

// 짧은 줄임말 엄격 매칭: 앞은 시작/공백/구두점, 뒤는 끝/물음표/모집성 단어
function weakHit(content, kw) {
  const re = new RegExp(
    `(^|[\\s,.!?~])${kw}(\\s*[?？!~]|\\s*$|\\s*(가자|하자|할|할래|ㄱ|고고|고|콜|모집|드실|치실|각))`
  );
  return re.test(content);
}

// 매칭되면 { mode, size }, 아니면 null
export function detectTrigger(content) {
  if (STRONG_4.some((k) => content.includes(k))) return { mode: '코발트', size: 4 };
  if (STRONG_3.some((k) => content.includes(k))) return { mode: '이터널리턴', size: 3 };
  if (WEAK_3.some((k) => weakHit(content, k))) return { mode: '이터널리턴', size: 3 };
  return null;
}
