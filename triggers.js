// 채팅 트리거 감지.
//  - 메시지 전체가 정확히 "키워드?" 형태일 때만 동작합니다.
//    (앞뒤 공백은 trim, 키워드와 ? 사이의 공백은 허용)
//    예) "오터턴?"            → 매칭
//        " 오터턴 ? "          → 매칭 (trim)
//        "오터턴? 같이 하자"    → 매칭 안 됨
//        "내가 오터턴? 했는데"  → 매칭 안 됨
//  - 키워드 목록은 keywordStore(keywords.json)에서 읽어옵니다.
//  - "코발트?" → 4명 모집 / "오터턴? / 이터널리턴? ..." → 3명 모집 (기본값)

import { getKeywords } from './keywordStore.js';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 메시지 전체가 키워드+? 인지 검사
function hit(text, kw) {
  return new RegExp(`^${escapeRegExp(kw)}\\s*[?？]$`).test(text);
}

// 매칭되면 { mode, size }, 아니면 null
export function detectTrigger(content) {
  const text = content.trim();
  const kws = getKeywords();
  if (kws[4].some((k) => hit(text, k))) return { mode: '코발트', size: 4 };
  if (kws[3].some((k) => hit(text, k))) return { mode: '이터널리턴', size: 3 };
  return null;
}
