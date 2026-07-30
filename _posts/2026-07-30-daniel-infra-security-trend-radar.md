---
layout: post
title: "[Daniel IT Infra & Security] 인프라·보안 뉴스 트렌드 레이더 만들기"
date: 2026-07-30 07:00:00 +0900
categories: [Project]
tags: [Next.js, RSS, Vercel-Blob, Vercel-Cron, TypeScript, SVG]
---

안녕하세요, 멩기입니다.

이번엔 국내외 인프라·보안 뉴스를 매일 자동으로 모아서, 지금 가장 많이 언급되는 키워드를 토픽별로 보여주는 개인 사이트 **Daniel IT Infra & Security**를 만든 과정을 정리해봅니다. [daniel-infra-security.vercel.app](https://daniel-infra-security.vercel.app)에 배포되어 있고, 매일 아침 자동으로 새 기사를 수집합니다.

---

## 🛠️ 기본 구조

- **수집**: 국내(보안뉴스, 데일리시큐, 지디넷코리아) + 해외(Hacker News, The Register Security, KrebsOnSecurity, InfoQ) RSS를 `rss-parser`로 파싱
- **트렌드 엔진**: 기사 본문에서 키워드(별칭 여러 개 등록)를 매칭해 빈도를 집계, 보안·네트워크·인프라·AI 4개 토픽으로 묶음
- **저장**: Vercel Blob (DB 없이 JSON)
- **자동화**: Vercel Cron으로 매일 1회 크롤

```ts
export const KEYWORDS: KeywordDef[] = [
  { key: "zero-trust", label: "제로트러스트", aliases: ["zero trust", "zero-trust", "제로트러스트"], topic: "security" },
  { key: "kubernetes", label: "Kubernetes", aliases: ["kubernetes", "k8s", "쿠버네티스"], topic: "infra" },
  // ...
];
```

키워드마다 한글/영문/약어 별칭을 여러 개 등록해두고, 기사 제목+본문 어디든 하나라도 나오면 같은 키워드로 집계합니다. 집계된 키워드는 다시 상위 토픽(보안/네트워크/인프라/AI)으로 묶어서, 언급량이 많은 토픽·키워드 순으로 정렬합니다.

데이터 저장은 지난번 [PaceLab](https://leemingi6901.github.io/posts/pacelab-marathon-ai-analysis/)을 만들며 겪었던 **Vercel Blob CDN 캐시 일관성 문제**를 알고 있었기 때문에, 처음부터 "매번 타임스탬프 붙인 새 경로에 쓰고, `list()`로 최신 버전을 찾아 읽는" 패턴을 그대로 재사용했습니다. 한 번 겪은 문제는 다음 프로젝트에서 안 겪는 게 남는 장사더라고요.

---

## 🛠️ 오늘의 삽질 1 — RSS 인코딩이 반쪽만 깨짐

국내 매체 RSS 중 일부(보안뉴스 등)가 EUC-KR 인코딩이라, HTTP 클라이언트의 기본 UTF-8 디코딩만 믿으면 한글이 깨졌습니다. `Content-Type` 헤더와 XML 선언(`<?xml encoding="...">`)을 직접 확인해서 인코딩을 알아낸 뒤, `iconv-lite`로 디코딩하도록 고쳤습니다.

```ts
function detectCharset(contentType: string, head: string): string {
  const ctMatch = /charset=["']?([\w-]+)/i.exec(contentType);
  if (ctMatch) return ctMatch[1];
  const xmlMatch = /encoding=["']([\w-]+)["']/i.exec(head);
  if (xmlMatch) return xmlMatch[1];
  return "utf-8";
}
```

동시에, 지디넷코리아 같은 일반 IT 매체 피드엔 부고·유통·실적 뉴스처럼 인프라/보안과 무관한 기사도 섞여 있어서, 키워드 매칭이 0건인 기사는 아예 목록에서 제외하도록 필터를 추가했습니다.

## 🛠️ 오늘의 삽질 2 — Cron이 매시간 안 돌아감

처음엔 크롤링을 몇 시간마다 한 번씩 돌리려고 했는데, Vercel Hobby 플랜은 **cron job을 하루 1회까지만** 허용한다는 걸 배포하고 나서야 알았습니다. 스케줄을 하루 한 번(22:00 UTC = 한국시간 07:00)으로 조정했습니다.

```json
{
  "crons": [{ "path": "/api/cron/crawl", "schedule": "0 22 * * *" }]
}
```

---

## 🌌 히어로 — daniel.wiki 스타일 재사용, 그리고 성능 삽질

히어로 비주얼은 [daniel.wiki](https://daniel-tech-wiki.vercel.app) 홈에서 만들었던 "비정형 SVG 네트워크 그래프" 패턴을 그대로 가져와서, 처음엔 오늘/이번주/이번달/올해 4개 시간창을 노드로 배치했다가, 나중엔 보안·네트워크·인프라·AI 토픽 기반으로 바꿨습니다. 시간창보다 토픽으로 묶는 게 "지금 뭐가 뜨고 있는지" 한눈에 보기엔 더 직관적이었습니다.

한 라운드에서는 허브 레이더 핑, 회전하는 궤도 링, 간선마다 색이 교차하는 트레일 펄스, 클릭 리플 버스트까지 넣어서 꽤 화려하게 만들었습니다. 그런데 이후에 저사양 PC에서 테스트해보니 **아래로 스크롤할 때 버벅임**이 있었습니다.

원인을 찾아보니 허브 펄스·시간창 노드의 breathing glow 효과를 `filter: drop-shadow(...)`로 구현했는데, 이 값을 매 프레임 바꾸면 브라우저가 매번 해당 영역을 **다시 래스터화**해야 해서 비용이 컸습니다. GPU가 합성만으로 처리할 수 있는 `opacity`/`transform` 기반 효과와 달리, filter 값 변경은 CPU/GPU 래스터화 단계를 다시 태워서 저사양 환경에서 스크롤 프레임을 갉아먹은 것이었습니다.

같은 시각 효과를 filter 없이 재구현했습니다 — 색이 도는 효과는 `stroke` 색상 자체를 순환시키고, breathing 효과는 이미 쓰고 있던 opacity/transform 기반 glow-pulse로 대체했습니다.

```
- filter: drop-shadow(0 0 Npx currentColor)  // 매 프레임 재래스터화
+ stroke: <순환하는 색상값>                    // GPU 합성만으로 처리
+ opacity/transform 기반 pulse                // 기존 패턴 재사용
```

시각적으로는 거의 동일한데 스크롤이 눈에 띄게 부드러워졌습니다. "예쁜 효과 하나 추가"가 항상 공짜가 아니라는 걸, 이번엔 `filter`로 다시 확인한 셈입니다.

---

## ✅ 마무리

RSS 수집 → 키워드 트렌드 → Blob 저장 → cron 자동화까지, PaceLab에서 다졌던 패턴(버전-경로 Blob 저장)을 재사용하니 새 프로젝트인데도 데이터 레이어는 금방 잡혔습니다. 반대로 히어로 비주얼 쪽은 매번 새로 겪는 문제가 있었는데, 이번엔 "화려함과 성능은 트레이드오프"라는 걸 `filter` 애니메이션으로 배웠습니다. 다음엔 처음부터 GPU 합성 가능한 속성(opacity/transform)만으로 애니메이션을 설계하는 습관을 들여야겠습니다.

이상입니다 🙌
