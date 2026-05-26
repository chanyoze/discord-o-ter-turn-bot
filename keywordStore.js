// 호출 메시지(키워드) 영속 저장소.
//  - keywords.json 한 곳에 모드별 키워드 배열을 저장.
//  - 봇 시작 시 init() 으로 메모리에 로드. 이후 조회는 동기.
//  - 추가 시 메모리 캐시 + 파일에 함께 반영.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'keywords.json');

// 파일이 없을 때 채워 넣을 기본값 — 기존 triggers.js 에 박혀 있던 목록.
const DEFAULT = {
  3: ['오터턴', '이터널리턴', '이리샥', '블석', '이리', '이턴'],
  4: ['코발트'],
};

// { 3: string[], 4: string[] } 형태로 메모리에 캐시.
let cache = null;

async function persist() {
  await writeFile(FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export async function initKeywords() {
  try {
    const raw = await readFile(FILE, 'utf8');
    const data = JSON.parse(raw);
    cache = { 3: data['3'] ?? [], 4: data['4'] ?? [] };
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    cache = { 3: [...DEFAULT[3]], 4: [...DEFAULT[4]] };
    await persist();
  }
}

// 동기 조회 — init 이후 호출 보장.
export function getKeywords() {
  if (!cache) throw new Error('keywordStore가 초기화되지 않았어요. initKeywords()를 먼저 호출하세요.');
  return cache;
}

// 추가 결과: { ok: true, keyword, size } 또는 { ok: false, reason }
export async function addKeyword(rawKeyword, size) {
  if (!cache) throw new Error('keywordStore가 초기화되지 않았어요.');
  if (size !== 3 && size !== 4) return { ok: false, reason: '인원은 3 또는 4만 가능해요.' };

  const keyword = String(rawKeyword ?? '').trim();
  if (!keyword) return { ok: false, reason: '빈 메시지는 추가할 수 없어요.' };
  if (keyword.length > 20) return { ok: false, reason: '메시지는 20자 이내로 적어주세요.' };
  // 트리거 정규식이 흔들리지 않게 ? 자체나 공백류는 거른다.
  if (/[?？]/.test(keyword)) return { ok: false, reason: '메시지에는 물음표(?)를 포함하지 마세요.' };
  if (/\s/.test(keyword)) return { ok: false, reason: '메시지에는 공백을 포함하지 마세요.' };

  const duplicateIn = [3, 4].find((s) => cache[s].includes(keyword));
  if (duplicateIn) {
    return { ok: false, reason: `이미 ${duplicateIn}명 모집에 등록된 메시지예요: ${keyword}` };
  }

  cache[size].push(keyword);
  await persist();
  return { ok: true, keyword, size };
}
