# 🎮 오터턴봇 (이터널리턴 파티 모집)

채팅에 **`코발트?` / `오터턴?` / `이터널리턴?`** 처럼 **키워드+물음표**를 치면 모집 카드를 띄우고,
친구들이 **선착순**으로 참가하는 봇. **한 번 참가하면 못 빠집니다 😈**

## 기능
- 채팅 트리거 → 모집 카드 자동 생성 (**키워드 바로 뒤에 `?`가 있어야 동작** — 문장 속에 박혀도 ?없으면 무시)
  - `코발트?` → **4명** 모집
  - `오터턴?` `이터널리턴?` `이리샥?` `블석?` `이리?` `이턴?` → **3명** 모집
- **제안한 사람(트리거/슬래시 친 사람)은 1번으로 자동 참가**
- `/모집 [인원]` 슬래시 커맨드로도 시작 (3명/4명)
- **참가하기** 버튼 = 선착순 등록 (취소 불가)
- 정원이 다 차면 → 마감 + 참가자 전원 @멘션으로 호출
- **서버당 파티는 1개만** — 이미 모집 중이면 새로 안 만들고 기존 파티 링크로 이어짐
- 30분 지나면 무조건 자동 마감 (`EXPIRE_MINUTES`로 조정)

---

## 1. 새 디스코드 봇 만들기 (스모크봇과 동일한 방식)

> ⚠️ 스모크봇과 **별개의 새 봇**이 필요합니다 (새 애플리케이션 생성).

1. https://discord.com/developers/applications → **New Application** → 이름(예: 오터턴봇)
2. **General Information** → **APPLICATION ID** 복사 → `.env`의 `CLIENT_ID`
3. **Bot** 탭 →
   - **Reset Token** → 토큰 복사 → `.env`의 `DISCORD_TOKEN`
   - **MESSAGE CONTENT INTENT** **켜기(ON)** → 하단 **Save Changes** ← 채팅 트리거에 필수
4. **OAuth2 → URL Generator** →
   - SCOPES: `bot`, `applications.commands`
   - BOT PERMISSIONS: `Send Messages`, `Embed Links`, `Read Message History`
   - 생성된 URL로 봇을 서버에 초대
5. 서버 우클릭 → "서버 ID 복사" → `.env`의 `GUILD_ID`

## 2. 설치 & 실행

```powershell
npm install
copy .env.example .env   # 그리고 .env 값 3개 채우기
npm run deploy           # 슬래시 커맨드 등록 (한 번)
npm start                # 봇 켜기
```

`✅ 로그인 완료: ...` 가 뜨면 성공. 채팅에 `오터턴` 쳐보세요!

## 참고
- 현재는 **로컬 실행용** (PC 켜져 있고 `npm start` 중일 때만 동작).
- 24시간 구동을 원하면 나중에 Railway/Oracle 등에 올릴 수 있습니다.
- 모집 상태는 메모리에 보관 → 봇 재시작 시 진행 중이던 모집 카드는 만료 처리됩니다 (새로 시작하면 됨).
