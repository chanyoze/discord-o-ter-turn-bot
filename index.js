// 오터턴봇 — 이터널리턴 파티 선착순 모집.
//  - 채팅 "코발트"(4명) / "오터턴·이터널리턴·이리샥·이리·이턴"(3명) → 모집 카드
//  - /모집 [인원] 슬래시 커맨드로도 시작
//  - "참가하기" 버튼 = 선착순 등록. 한 번 참가하면 못 빠짐(취소 없음)
//  - 정원 다 차면 마감 + 참가자 전원 @멘션

import 'dotenv/config';
import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { detectTrigger } from './triggers.js';
import { buildJoinRow, buildRecruitEmbed } from './ui.js';
import { log } from './logger.js';

const EXPIRE_MS = Number(process.env.EXPIRE_MINUTES || 10) * 60 * 1000; // 미달 시 자동 만료

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 채팅 트리거 감지에 필요(포털에서 켜야 함)
  ],
});

// 활성 모집: messageId -> { mode, size, members:[{id,name}], status, timer }
const sessions = new Map();

client.once(Events.ClientReady, (c) => log.info(`✅ 로그인 완료: ${c.user.tag}`));

// 전역 에러 로깅
client.on(Events.Error, (e) => log.error('Discord client 오류', e));
client.on(Events.Warn, (m) => log.warn('Discord 경고', m));
process.on('unhandledRejection', (e) => log.error('처리되지 않은 Promise 거부', e));
process.on('uncaughtException', (e) => log.error('잡히지 않은 예외', e));

function nameOf(interaction) {
  return interaction.member?.displayName ?? interaction.user.username;
}

// 모집 카드 생성 + 만료 타이머 등록
function registerSession(msg, mode, size) {
  const session = { mode, size, members: [], status: 'open', timer: null, message: msg };
  session.timer = setTimeout(() => expire(msg.id), EXPIRE_MS);
  sessions.set(msg.id, session);
}

async function createRecruit(channel, mode, size) {
  const msg = await channel.send({
    embeds: [buildRecruitEmbed({ mode, size, members: [], status: 'open' })],
    components: buildJoinRow(),
  });
  registerSession(msg, mode, size);
}

// 정원 미달 상태로 시간 초과 → 만료 처리
async function expire(messageId) {
  const s = sessions.get(messageId);
  if (!s || s.status !== 'open') return;
  s.status = 'expired';
  try {
    await s.message.edit({ embeds: [buildRecruitEmbed(s)], components: buildJoinRow(true) });
  } catch (e) {
    log.error('만료 처리 오류', e);
  }
}

// ── 채팅 트리거 ──────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const hit = detectTrigger(message.content);
  if (hit) await createRecruit(message.channel, hit.mode, hit.size);
});

// ── 상호작용(슬래시 / 버튼) ───────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 슬래시: /모집 [인원]
    if (interaction.isChatInputCommand() && interaction.commandName === '모집') {
      const size = interaction.options.getInteger('인원') ?? 3;
      const mode = size === 4 ? '코발트' : '이터널리턴';
      await interaction.reply({
        embeds: [buildRecruitEmbed({ mode, size, members: [], status: 'open' })],
        components: buildJoinRow(),
      });
      const msg = await interaction.fetchReply();
      registerSession(msg, mode, size);
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
      if (s.members.some((u) => u.id === interaction.user.id)) {
        await interaction.reply({
          content: '이미 참여 중이에요! (한 번 들어오면 못 빠져요 😈)',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // 선착순 등록
      s.members.push({ id: interaction.user.id, name: nameOf(interaction) });

      if (s.members.length >= s.size) {
        // 정원 충족 → 마감
        s.status = 'full';
        if (s.timer) clearTimeout(s.timer);
        await interaction.update({
          embeds: [buildRecruitEmbed(s)],
          components: buildJoinRow(true),
        });
        const mentions = s.members.map((u) => `<@${u.id}>`).join(' ');
        await interaction.channel.send(
          `${mentions}\n🎮 **${s.mode}** 파티 정원(${s.size}명)이 다 찼어요! 모두 모여주세요! 🚀`
        );
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
