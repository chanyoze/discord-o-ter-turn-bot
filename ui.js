// 모집 카드(임베드)와 참가 버튼.

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const OPEN = 0x2ecc71; // 초록(모집 중)
const FULL = 0x3498db; // 파랑(완료)
const EXPIRED = 0x95a5a6; // 회색(만료)
const BRAND = '🎮 오터턴봇 · 선착순 파티 모집';

// 참가 버튼 (취소 버튼 없음 — 한 번 참가하면 못 빠짐)
export function buildJoinRow(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('party|join')
        .setLabel('참가하기')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    ),
  ];
}

function memberList(members) {
  if (!members.length) return '_아직 참가자가 없어요. 버튼을 눌러 선착순 참가!_';
  return members.map((m, i) => `**${i + 1}.** ${m.name}`).join('\n');
}

export function buildRecruitEmbed({ mode, size, members, status }) {
  const remain = size - members.length;
  let color = OPEN;
  let suffix = '';
  let note;
  if (status === 'full') {
    color = FULL;
    suffix = ' — 모집 완료! 🎉';
    note = '정원이 다 찼어요. 모두 모여주세요!';
  } else if (status === 'expired') {
    color = EXPIRED;
    suffix = ' — 시간 초과 ⌛';
    note = '시간 안에 정원이 안 차서 마감됐어요.';
  } else {
    note = `선착순 **${size}명** 모집 중! _(한 번 참가하면 못 빠져요 😈)_`;
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎮 ${mode} 파티 모집${suffix}`)
    .setDescription(`${note}\n\n**참가자 (${members.length}/${size})**\n${memberList(members)}`)
    .addFields(
      { name: '정원', value: `${size}명`, inline: true },
      { name: '현재', value: `${members.length}명`, inline: true },
      { name: '남은 자리', value: status === 'open' ? `${remain}명` : '—', inline: true }
    )
    .setFooter({ text: BRAND })
    .setTimestamp();
}
