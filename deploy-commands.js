// 슬래시 커맨드(/모집)를 디스코드에 등록. 커맨드 추가/변경 시 "npm run deploy".

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('모집')
    .setDescription('이터널리턴 파티를 선착순 모집합니다')
    .addIntegerOption((o) =>
      o
        .setName('인원')
        .setDescription('정원 (기본 3명)')
        .addChoices({ name: '3명', value: 3 }, { name: '4명 (코발트)', value: 4 })
    ),
  new SlashCommandBuilder()
    .setName('명령어')
    .setDescription('호출 메시지 관리')
    .addSubcommand((sc) =>
      sc.setName('목록').setDescription('현재 등록된 호출 메시지 종류를 보여줍니다')
    )
    .addSubcommand((sc) =>
      sc
        .setName('추가')
        .setDescription('새 호출 메시지를 추가합니다 (예: 메시지=오터턴, 인원=3 → "오터턴?" 매칭)')
        .addStringOption((o) =>
          o.setName('메시지').setDescription('등록할 호출 메시지 (물음표/공백 없이)').setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('인원')
            .setDescription('이 메시지에 연결할 정원')
            .addChoices({ name: '3명', value: 3 }, { name: '4명 (코발트)', value: 4 })
            .setRequired(true)
        )
    ),
].map((c) => c.toJSON());

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ .env 에 DISCORD_TOKEN 과 CLIENT_ID 를 먼저 채워주세요.');
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

// GUILD_ID 는 콤마(,)로 여러 서버를 넣을 수 있습니다. 비우면 전체(글로벌) 등록.
const guildIds = (GUILD_ID ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

try {
  if (guildIds.length) {
    for (const gid of guildIds) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, gid), { body: commands });
      console.log(`✅ 서버 ${gid} 등록 완료 (즉시 반영)`);
    }
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ 전체(글로벌) 등록 완료 (반영까지 최대 1시간)');
  }
} catch (err) {
  console.error('❌ 등록 실패:', err);
  process.exit(1);
}
