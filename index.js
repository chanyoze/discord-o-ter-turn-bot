// 오터턴봇 — 이터널리턴 파티 선착순 모집.
//  - 채팅 "코발트?"(4명) / "오터턴?·이터널리턴?·이리샥?·블석?·이리?·이턴?"(3명) → 모집 카드
//  - /모집 [인원] 슬래시 커맨드로도 시작
//  - 제안한 사람(트리거/슬래시 친 사람)은 1번으로 자동 참가
//  - "참가하기" 버튼 = 선착순 등록. 한 번 참가하면 못 빠짐(취소 없음)
//  - 정원 다 차면 마감 + 참가자 전원 @멘션
//  - 서버당 파티는 1개만. 이미 모집 중이면 새로 안 만들고 기존 파티로 이어짐
//  - 30분 지나면 무조건 자동 마감

import 'dotenv/config';
import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { detectTrigger } from './triggers.js';
import { buildJoinRow, buildRecruitEmbed } from './ui.js';
import { log } from './logger.js';
import { initKeywords, getKeywords, addKeyword } from './keywordStore.js';

await initKeywords();

const EXPIRE_MS = Number(process.env.EXPIRE_MINUTES || 30) * 60 * 1000; // 자동 마감 시간

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 채팅 트리거 감지에 필요(포털에서 켜야 함)
  ],
});

// 활성 모집: messageId -> { mode, size, members:[{id,name}], status, message, guildId, timer }
const sessions = new Map();
// 서버당 현재 열린 모집: guildId -> messageId (두 파티 공존 방지)
const activeByGuild = new Map();

client.once(Events.ClientReady, (c) => log.info(`✅ 로그인 완료: ${c.user.tag}`));

// 전역 에러 로깅
client.on(Events.Error, (e) => log.error('Discord client 오류', e));
client.on(Events.Warn, (m) => log.warn('Discord 경고', m));
process.on('unhandledRejection', (e) => log.error('처리되지 않은 Promise 거부', e));
process.on('uncaughtException', (e) => log.error('잡히지 않은 예외', e));

function memberName(member, user) {
  return member?.displayName ?? user.username;
}

// 서버에 현재 열린(open) 모집이 있으면 반환, 없거나 닫혔으면 null
function getActiveOpen(guildId) {
  const id = activeByGuild.get(guildId);
  if (!id) return null;
  const s = sessions.get(id);
  if (!s || s.status !== 'open') {
    activeByGuild.delete(guildId);
    return null;
  }
  return s;
}

// 참가 시도: 'added' | 'already' | 'full' | 'closed'
function tryJoin(session, user) {
  if (session.status !== 'open') return 'closed';
  if (session.members.some((m) => m.id === user.id)) return 'already';
  if (session.members.length >= session.size) return 'full';
  session.members.push(user);
  return 'added';
}

// 새 파티 생성 (제안자 자동 참가)
async function createParty(channel, guildId, mode, size, creator) {
  const members = [creator];
  const msg = await channel.send({
    embeds: [buildRecruitEmbed({ mode, size, members, status: 'open' })],
    components: buildJoinRow(),
  });
  const session = { mode, size, members, status: 'open', message: msg, guildId, timer: null };
  session.timer = setTimeout(() => expire(msg.id), EXPIRE_MS);
  sessions.set(msg.id, session);
  activeByGuild.set(guildId, msg.id);
  return session;
}

// 정원 충족 마감 처리 (카드 갱신은 호출부에서, 여기선 상태/멘션)
async function finalizeFull(session, channel) {
  session.status = 'full';
  if (session.timer) clearTimeout(session.timer);
  if (activeByGuild.get(session.guildId) === session.message.id) {
    activeByGuild.delete(session.guildId);
  }
  const mentions = session.members.map((u) => `<@${u.id}>`).join(' ');
  await channel.send(
    `${mentions}\n🎮 **${session.mode}** 파티 정원(${session.size}명)이 다 찼어요! 모두 모여주세요! 🚀`
  );
}

// 30분 경과 자동 마감
async function expire(messageId) {
  const s = sessions.get(messageId);
  if (!s || s.status !== 'open') return;
  s.status = 'expired';
  if (activeByGuild.get(s.guildId) === messageId) activeByGuild.delete(s.guildId);
  try {
    await s.message.edit({ embeds: [buildRecruitEmbed(s)], components: buildJoinRow(true) });
  } catch (e) {
    log.error('만료 처리 오류', e);
  }
}

// 기존 파티에 이어서 참가시키기 (카드 갱신 + 결과 반환 메시지 텍스트)
async function continueExisting(existing, channel, user) {
  const r = tryJoin(existing, user);
  if (existing.members.length >= existing.size) {
    await existing.message
      .edit({ embeds: [buildRecruitEmbed(existing)], components: buildJoinRow(true) })
      .catch(() => {});
    await finalizeFull(existing, channel);
    return `정원이 다 찼어요! → ${existing.message.url}`;
  }
  await existing.message
    .edit({ embeds: [buildRecruitEmbed(existing)], components: buildJoinRow() })
    .catch(() => {});
  const note = r === 'added' ? '참가시켰어요! ' : r === 'already' ? '이미 참가 중이에요. ' : '';
  return `이미 모집 중인 파티가 있어요. ${note}여기서 이어서 참가하세요 → ${existing.message.url}`;
}

// ── 채팅 트리거 ──────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const hit = detectTrigger(message.content);
  if (!hit) return;

  const user = { id: message.author.id, name: memberName(message.member, message.author) };
  const existing = getActiveOpen(message.guild.id);
  if (existing) {
    const text = await continueExisting(existing, message.channel, user);
    await message.channel.send(text);
  } else {
    await createParty(message.channel, message.guild.id, hit.mode, hit.size, user);
  }
});

// ── 상호작용(슬래시 / 버튼) ───────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 슬래시: /명령어 (목록|추가)
    if (interaction.isChatInputCommand() && interaction.commandName === '명령어') {
      const sub = interaction.options.getSubcommand();

      // /명령어 목록 — 등록된 호출 메시지 종류 보여주기
      if (sub === '목록') {
        const kws = getKeywords();
        const fmt = (arr) => (arr.length ? arr.map((k) => `\`${k}?\``).join(', ') : '_없음_');
        await interaction.reply({
          content: [
            '📋 **현재 등록된 호출 메시지**',
            `• 4명 모집(코발트): ${fmt(kws[4])}`,
            `• 3명 모집(이터널리턴): ${fmt(kws[3])}`,
            '',
            '_채팅에 정확히 위 형태(키워드+?)로 입력하면 모집이 시작됩니다._',
            '_새 호출 메시지는 `/명령어 추가` 로 등록할 수 있어요._',
          ].join('\n'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // /명령어 추가 [메시지] [인원]
      if (sub === '추가') {
        const keyword = interaction.options.getString('메시지', true);
        const size = interaction.options.getInteger('인원', true);
        const result = await addKeyword(keyword, size);
        if (!result.ok) {
          await interaction.reply({ content: `⚠️ ${result.reason}`, flags: MessageFlags.Ephemeral });
          return;
        }
        log.info(`키워드 추가: "${result.keyword}" → ${result.size}명 모집 (by ${interaction.user.tag})`);
        await interaction.reply({
          content: `✅ 등록 완료! 이제 \`${result.keyword}?\` 라고 입력하면 **${result.size}명** 모집이 시작돼요.`,
        });
        return;
      }
      return;
    }

    // 슬래시: /모집 [인원]
    if (interaction.isChatInputCommand() && interaction.commandName === '모집') {
      const user = { id: interaction.user.id, name: memberName(interaction.member, interaction.user) };
      const existing = getActiveOpen(interaction.guildId);
      if (existing) {
        const text = await continueExisting(existing, interaction.channel, user);
        await interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
        return;
      }
      const size = interaction.options.getInteger('인원') ?? 3;
      const mode = size === 4 ? '코발트' : '이터널리턴';
      await interaction.reply({
        embeds: [buildRecruitEmbed({ mode, size, members: [user], status: 'open' })],
        components: buildJoinRow(),
      });
      const msg = await interaction.fetchReply();
      const session = { mode, size, members: [user], status: 'open', message: msg, guildId: interaction.guildId, timer: null };
      session.timer = setTimeout(() => expire(msg.id), EXPIRE_MS);
      sessions.set(msg.id, session);
      activeByGuild.set(interaction.guildId, msg.id);
      return;
    }

    // 버튼: 참가하기
    if (interaction.isButton()) {
      const [ns, action] = interaction.customId.split('|');
      if (ns !== 'party' || action !== 'join') return;

      const s = sessions.get(interaction.message.id);
      if (!s) {
        await interaction.reply({
          content: '이 모집은 만료됐어요. 새로 시작해주세요.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (s.status !== 'open') {
        await interaction.reply({ content: '이미 마감된 모집이에요.', flags: MessageFlags.Ephemeral });
        return;
      }

      const user = { id: interaction.user.id, name: memberName(interaction.member, interaction.user) };
      const r = tryJoin(s, user);
      if (r === 'already') {
        await interaction.reply({
          content: '이미 참여 중이에요! (한 번 들어오면 못 빠져요 😈)',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (s.members.length >= s.size) {
        await interaction.update({ embeds: [buildRecruitEmbed(s)], components: buildJoinRow(true) });
        await finalizeFull(s, interaction.channel);
      } else {
        await interaction.update({ embeds: [buildRecruitEmbed(s)], components: buildJoinRow() });
      }
      return;
    }
  } catch (err) {
    log.error('상호작용 처리 오류', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
