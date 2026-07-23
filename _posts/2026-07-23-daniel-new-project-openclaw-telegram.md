---
layout: post
title: "[PROJECT] 새 프로젝트 세팅기 — GitHub 저장소 + OpenClaw로 텔레그램 AI 비서 만들기"
date: 2026-07-23 22:00:00 +0900
categories: [Project]
tags: [GitHub, OpenClaw, Ollama, LLM, Telegram, launchd, qwen3]
---

안녕하세요, 멩기입니다.

오늘은 새 프로젝트를 시작하면서, GitHub 저장소 생성부터 **OpenClaw**(오픈소스 개인 AI 어시스턴트)를 맥미니에 올려 **텔레그램으로 대화하는 로컬 AI 비서**를 붙이는 것까지 하루 만에 진행한 과정을 기록으로 남겨봅니다. 모델은 지난번 Daily Growth 프로젝트에서 썼던 Ollama를 그대로 활용해서, **API 비용 0원**으로 구성했습니다.

---

## 📦 1. 새 프로젝트 + GitHub 저장소

먼저 빈 프로젝트를 만들고 GitHub private 저장소로 올렸습니다.

```bash
mkdir Daniel-New-Project && cd Daniel-New-Project
git init -b main
# README.md, .gitignore, AGENTS.md 작성
git add -A && git commit -m "chore: 프로젝트 초기 설정"
gh repo create Daniel-New-Project --private --source=. --push
```

특이한 점 하나: 프로젝트 루트에 `AGENTS.md`라는 파일을 뒀습니다. 요즘 AI 코딩 도구들(Claude Code, OpenClaw 등)이 프로젝트에서 작업할 때 이 파일을 읽고 규칙을 따르는 관례가 있어서, "비밀키 커밋 금지" 같은 규칙을 미리 적어뒀습니다.

---

## 🦞 2. OpenClaw 설치와 기본 구성

OpenClaw는 npm으로 설치합니다.

```bash
npm install -g openclaw
```

전체 온보딩 마법사(`openclaw onboard`)를 돌리는 대신, 단계별로 구성했습니다.

```bash
openclaw setup --baseline                 # 기본 config/workspace 생성
openclaw config set gateway.mode local    # 게이트웨이 로컬 모드
openclaw config set gateway.auth.mode token
openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
openclaw config set agents.defaults.workspace ~/Desktop/Daniel-New-Project
```

마지막 줄이 포인트인데, **에이전트의 작업 공간을 프로젝트 폴더로 지정**하면 OpenClaw가 프로젝트의 `AGENTS.md`를 자기 운영 지침으로 읽습니다. 대신 OpenClaw가 자기 상태 파일들(`IDENTITY.md`, `SOUL.md`, `USER.md` 등)을 그 폴더에 만들기 때문에, 이런 개인 데이터가 저장소에 올라가지 않도록 `.gitignore`에 꼭 추가해야 합니다.

---

## 🤖 3. 모델: Ollama + qwen3:8b

OpenClaw에서 Ollama는 플러그인으로 제공됩니다.

```bash
openclaw plugins enable ollama
ollama pull qwen3:8b
openclaw models set ollama/qwen3:8b
```

모델은 **qwen3:8b**를 골랐습니다. 기존에 받아둔 gemma2/llama3는 Ollama에서 도구 호출(tool calling) 지원이 약해서, 에이전트 용도로는 tool calling이 되는 qwen3 계열이 낫다고 판단했습니다. 16GB 램 맥미니에서 무리 없이 돌아갑니다.

한 가지 시행착오: 모델을 설정해도 처음엔 `Unknown model: ollama/qwen3:8b` 오류가 났는데, 에러 메시지가 시키는 대로 config에 모델 항목을 직접 등록하니 해결됐습니다.

```bash
echo '{ models: { providers: { ollama: { models: [{ id: "qwen3:8b", name: "qwen3:8b" }] } } } }' \
  | openclaw config patch --stdin
```

---

## 📱 4. 텔레그램 연동

[@BotFather](https://t.me/BotFather)에서 봇을 만들어 토큰을 발급받고, 채널 설정 마법사를 돌립니다.

```bash
openclaw channels add
```

여기서 제가 겪은 삽질 두 가지를 공유합니다.

1. **DM 정책에서 "Disabled (ignore DMs)"를 고르면 안 됩니다.** 이건 봇이 DM을 전부 무시한다는 뜻이라, 기본값인 **Pairing**을 선택해야 합니다. 페어링 모드에서는 모르는 사람이 봇에게 말을 걸면 페어링 코드부터 요구하기 때문에, 봇이 공개적으로 검색되더라도 승인 없이는 아무도 못 씁니다.
2. **마법사를 중간에 취소하면 입력한 토큰까지 전부 버려집니다.** Ctrl+C 누르지 말고 "Finished"까지 끝까지 진행해야 합니다.

마법사가 끝나면 게이트웨이를 재시작하고, 텔레그램에서 봇에게 첫 메시지를 보내면 페어링 코드가 옵니다.

```bash
openclaw pairing approve telegram <페어링코드>
openclaw config set commands.ownerAllowFrom '["telegram:<내_텔레그램_ID>"]'
```

`ownerAllowFrom`은 관리자 명령을 쓸 수 있는 계정을 지정하는 설정입니다. 페어링은 "대화 허용"일 뿐이고, 오너 등록을 해야 설정 변경 같은 민감한 명령이 가능합니다.

> 봇 토큰은 절대 채팅이나 블로그에 노출하면 안 됩니다. 노출됐다면 BotFather에서 `/revoke`로 즉시 재발급하세요. (저도 이번에 한 번 노출시켰다가 재발급하는 교훈을 얻었습니다…)
{: .prompt-warning }

---

## ⚙️ 5. 상시 실행 (launchd)

터미널을 꺼도 봇이 살아있도록 macOS 서비스로 등록했습니다.

```bash
openclaw gateway install    # LaunchAgent 등록 + 자동 시작
openclaw gateway status     # 상태 확인
```

이제 맥미니가 재부팅돼도 봇이 자동으로 올라옵니다. 참고로 nvm으로 설치한 Node를 쓰고 있으면 "버전 매니저 경로라 업그레이드 시 깨질 수 있다"는 경고가 뜹니다. nvm으로 Node 버전을 바꾸면 `openclaw gateway install`을 다시 실행해줘야 합니다.

---

## 🔥 6. 로컬 8B 모델의 한계 (트러블슈팅)

다 붙이고 나서 겪은 문제들이 오히려 제일 기록할 가치가 있는 부분입니다.

| 증상 | 원인 | 해결 |
|---|---|---|
| 인사만 했는데 에이전트가 프로젝트의 `AGENTS.md`를 엉뚱한 내용으로 덮어씀 | 8B 모델이 요청을 잘못 해석하고 파일 쓰기 도구를 실행 | git으로 복구 (`git checkout -- AGENTS.md`) — **작업 공간을 git 저장소로 두길 잘했다 싶은 순간** |
| 텔레그램에서 새로 말을 걸었는데 예전 대화의 답변을 그대로 반복 | CLI 테스트와 텔레그램이 같은 세션을 공유 + 작은 모델의 앵무새 현상 | `/new` 명령으로 세션 초기화 |

정리하면, **qwen3:8b는 무료 로컬 비서로는 충분히 재밌지만 도구 사용이 서툽니다.** 봇이 이상하게 굴면 일단 `/new`로 세션을 리셋하는 게 특효약이고, 진지하게 쓰려면 더 큰 모델이나 API 기반 모델로 올리는 걸 고려해야 할 것 같습니다.

---

## 마무리

오늘 구성한 스택을 요약하면:

- **프로젝트**: Daniel-New-Project (GitHub private, AGENTS.md 기반 AI 협업 규칙)
- **AI 비서**: OpenClaw + Ollama qwen3:8b (전부 로컬, API 비용 0원)
- **인터페이스**: 텔레그램 봇 (pairing 정책으로 접근 제한)
- **운영**: launchd 상시 실행

다음 단계는 이 프로젝트에 실제 기능을 채워 넣으면서, 텔레그램 비서에게 프로젝트 관련 작업을 시켜보는 것입니다. 로컬 LLM이 어디까지 해주는지 계속 실험해보겠습니다.

읽어주셔서 감사합니다! 🙌
