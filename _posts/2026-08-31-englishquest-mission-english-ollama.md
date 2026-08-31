---
layout: post
title: "[EnglishQuest] 미션 깨면서 영어 말하기 연습하는 봇 — Claude 프로토타입에서 로컬 Ollama로"
date: 2026-08-31 21:00:00 +0900
categories: [Project]
tags: [EnglishQuest, Next.js, TypeScript, Ollama, LLM, Claude]
---

안녕하세요, 멩기입니다.

이번엔 완전 초급자용 영어회화 연습 앱, **EnglishQuest**를 새로 만들었습니다. 텔레그램으로 매일 미션 받고, 웹에서는 OPIc 스타일로 AI랑 실시간 대화 연습하는 걸 목표로 하고 있는데, 이번 글은 그중 첫 단계 — **미션/레벨업 구조로 웹 프로토타입을 만들고, AI 대화 엔진을 Claude API에서 맥미니 로컬 Ollama로 바꾼 이야기**입니다.

---

## 1️⃣ 구조 — 미션 5개, 순차 잠금해제

완전 초급자가 부담 없이 시작하게 하려고, 레벨을 5개로 쪼갰습니다. 인사 나누기 → 카페 주문 → 길 묻기 → 취미 이야기 → OPIc 스타일 자기소개, 순서대로 난이도가 올라가고 이전 레벨을 깨야 다음이 열립니다.

```ts
export const SCENARIOS: Scenario[] = [
  { id: "greetings", order: 1, targetTurns: 4, xpReward: 80, /* ... */ },
  { id: "cafe-order", order: 2, targetTurns: 5, xpReward: 100, /* ... */ },
  // ...
  { id: "self-intro", order: 5, targetTurns: 6, xpReward: 150, /* ... */ },
];
```

진행 상황(XP, 클리어한 레벨)은 일단 `localStorage`에만 저장했습니다. 지난번 [PaceLab Vercel Blob 정지 사건](/posts/pacelab-blob-billing-suspended-batch-fix/)을 겪은 직후라, 프로토타입 단계에서 굳이 클라우드 DB부터 붙여서 또 과금 걱정을 만들고 싶지 않았습니다. 나중에 맥미니 + 웹 대시보드를 연동할 때 Supabase나 Neon으로 옮길 예정입니다.

## 2️⃣ 핵심 기능 — 리캐스트(recast) 방식 교정

이 앱에서 제일 신경 쓴 부분은 "**틀렸다고 대놓고 지적하지 않는 것**"입니다. 언어학습에서 리캐스트라고 부르는 기법인데, AI가 학습자의 실수를 직접 지적하는 대신 자기 대사 안에서 자연스럽게 맞는 표현으로 되받아 말해주는 방식입니다. 그래서 AI 응답을 `{reply, correctionNote}` 구조로 강제했습니다 — `reply`는 캐릭터 대사 그대로, `correctionNote`는 화면에 "💡 팁"으로 따로 떠 있는 한국어 설명입니다.

처음엔 Claude API의 강제 tool-use로 구현했습니다.

```ts
const RESPOND_TOOL: Anthropic.Tool = {
  name: "respond",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "..." },
      correctionNote: { type: "string", description: "..." },
    },
    required: ["reply"],
  },
};

const msg = await client.messages.create({
  model: MODEL,
  tools: [RESPOND_TOOL],
  tool_choice: { type: "tool", name: "respond" },
  // ...
});
```

`tool_choice`로 도구 호출을 강제하면 모델이 무조건 이 스키마대로만 응답하기 때문에, 파싱 실패 걱정 없이 깔끔하게 구조화된 응답을 받을 수 있었습니다.

## 3️⃣ "API 키가 없다" — 로컬 Ollama로 전환

여기까지 만들고 나니 문제가 하나 있었습니다. **Anthropic API 키가 없었습니다.** 저는 Claude Code로 개발은 하지만, 이 앱이 실제로 서비스로 돌아가려면 별도로 API 비용을 내야 하는데, 마침 맥미니가 있으니 로컬 LLM으로 완전히 무료로 돌리는 쪽을 택했습니다. [OpenClaw 텔레그램 봇](/posts/daniel-new-project-openclaw-telegram/) 때도 같은 이유로 Ollama를 썼었죠.

문제는 Ollama로 넘어가면 Claude의 `tool_choice` 같은 강제 도구 호출이 없다는 점이었습니다. 다행히 최근 Ollama는 `format`에 JSON 스키마를 넣으면 그 형식을 지키도록 강제하는 구조화 출력을 지원합니다.

```ts
const RESPONSE_FORMAT = {
  type: "object",
  properties: {
    reply: { type: "string", description: "..." },
    correctionNote: { type: "string", description: "..." },
  },
  required: ["reply", "correctionNote"],
};

const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
  method: "POST",
  body: JSON.stringify({
    model: MODEL, // 예: llama3.1
    stream: false,
    format: RESPONSE_FORMAT,
    messages: [{ role: "system", content: systemPrompt }, ...history],
  }),
});
```

다만 로컬 소형 모델은 Claude만큼 스키마를 완벽히 지키지 않을 수 있어서, JSON 파싱에 안전장치를 하나 더 넣었습니다. 곧바로 `JSON.parse`가 실패하면, 텍스트 전체에서 가장 바깥 `{ ... }` 블록만 정규식으로 추출해서 다시 시도합니다.

```ts
function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}
```

일부 모델이 JSON 앞뒤로 "Sure, here's the response:" 같은 잡담을 붙이는 경우를 대비한 폴백입니다. 연결 실패와 응답 파싱 실패도 구분해서 에러 메시지를 다르게 보여주도록 했습니다 — "맥미니에서 Ollama가 켜져 있는지 확인해주세요" vs "AI 응답을 해석하지 못했습니다"처럼요. 지금은 맥미니가 아니라 사무실 PC에서 개발 중이라 Ollama에 붙을 수 없는데, 실제로 이 에러 메시지가 정확히 뜨는 걸 확인하고 나서야 코드가 의도대로 동작한다는 걸 검증할 수 있었습니다.

## 4️⃣ 남은 숙제

지금은 웹에서 돌아가는 프로토타입까지만 만든 상태입니다. 남은 건:

- **맥미니에 Ollama 모델 받기** — `qwen2.5` 계열처럼 구조화 출력을 잘 지키는 모델 위주로 테스트할 예정
- **맥미니 밖에서 접근 가능하게 열기** — Cloudflare Tunnel이나 Tailscale로 `OLLAMA_BASE_URL`을 외부에서도 닿게 하기
- **텔레그램 봇** — 매일 미션을 비동기로 보내는 쪽
- **DB 연동** — `localStorage`를 Supabase/Neon으로 옮겨서 웹 대시보드랑 텔레그램이 같은 진행 상황을 공유하게 하기

일단 GitHub에 private 저장소로 올려두고 (`englishquest`), 다음번엔 맥미니 쪽 작업을 이어서 기록해보겠습니다.

읽어주셔서 감사합니다! 🙌
