// 간단한 로거. 콘솔 + 파일(bot.log)에 KST 타임스탬프로 기록.

import { appendFileSync } from 'node:fs';

const LOG_FILE = 'bot.log';

function kstStamp() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function fmt(arg) {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function write(level, args) {
  const line = `[${kstStamp()} KST] [${level}] ${args.map(fmt).join(' ')}`;
  (level === 'ERROR' ? console.error : console.log)(line);
  try {
    appendFileSync(LOG_FILE, line + '\n');
  } catch {
    // 파일 기록 실패해도 콘솔엔 남으므로 무시
  }
}

export const log = {
  info: (...a) => write('INFO', a),
  warn: (...a) => write('WARN', a),
  error: (...a) => write('ERROR', a),
};
