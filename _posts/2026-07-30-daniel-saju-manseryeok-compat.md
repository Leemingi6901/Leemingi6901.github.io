---
layout: post
title: "[Daniel 사주팔자] 만세력부터 궁합 점수화까지, 사주 사이트 만들기"
date: 2026-07-30 08:00:00 +0900
categories: [Project]
tags: [Next.js, TypeScript, lunar-javascript, Canvas]
---

안녕하세요, 멩기입니다.

이번엔 생년월일시를 넣으면 사주팔자를 뽑아 해석해주고, 두 사람의 궁합까지 점수화해주는 개인 사이트 **Daniel 사주팔자**를 만든 과정을 정리해봅니다. [daniel-saju.vercel.app](https://daniel-saju.vercel.app)에 배포되어 있고, 별도 백엔드나 DB 없이 **모든 계산이 클라이언트에서 결정론적으로** 이뤄집니다.

---

## 🛠️ 기술 스택

- **Next.js 16** + **React 19** + **TypeScript**
- **lunar-javascript** — 양력/음력 변환과 사주(팔자) 계산(만세력)을 담당하는 핵심 라이브러리
- DB 없음, 서버 상태 없음 — 입력값 → 순수 함수 계산 → 결과 렌더링

## 1️⃣ 사주 계산 — lunar-javascript로 만세력 뽑기

`Solar.fromYmdHms(...)`로 양력 생년월일시를 만들고, `.getLunar().getEightChar()`로 년/월/일/시 네 기둥(사주팔자)의 천간·지지를 얻습니다. 시간을 모르면 시주 없이 세 기둥만으로 계산합니다.

```ts
export function computeSaju(input: BirthInput): SajuResult {
  const solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour ?? 0, input.minute ?? 0, 0);
  const bazi = solar.getLunar().getEightChar();

  const year = buildPillar("년주", bazi.getYearGan(), bazi.getYearZhi(), bazi.getYearWuXing(), bazi.getYearShiShenGan());
  // month, day, time도 동일 패턴...

  const elementCounts: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of [year, month, day, ...(time ? [time] : [])]) {
    elementCounts[p.ganElement]++;
    elementCounts[p.zhiElement]++;
  }
  return { input, hourKnown, year, month, day, time, dayMasterElement: day.ganElement, elementCounts, naYinDay: bazi.getDayNaYin() };
}
```

네 기둥의 천간·지지 오행을 전부 세어서 오행 분포(목/화/토/금/수 개수)를 뽑고, **일간(日干)의 오행**을 이 사람의 "본질"로 삼아 이후 성격·연애·직업·재물·건강 5개 콘텐츠와 결혼운·궁합 계산의 기준으로 씁니다.

## 2️⃣ 궁합 점수화

두 사람의 일간 오행 관계(상생/동일/상극), 일지 관계(육합/충/해), 그리고 서로의 부족한 오행을 채워주는지를 점수로 합산합니다.

```ts
export function computeCompat(a: SajuResult, b: SajuResult): CompatResult {
  const stemScore = sRel === "generating" ? 35 : sRel === "same" ? 20 : 10;
  const branchScore = bRel === "harmony" ? 25 : bRel === "neutral" ? 15 : bRel === "harm" ? 8 : 0;
  const complementScore = Math.min(40, complements.length * 10); // 한쪽엔 없고 한쪽엔 많은 오행 = 서로 보완
  return { score: Math.round(stemScore + branchScore + complementScore), ... };
}
```

일지(日支)는 전통적으로 "배우자 자리"로 보는 자리라, 여기서 육합/충/해 관계가 나오는지가 궁합 해석의 핵심 축입니다. 여기에 대운/세운 흐름을 얹어서 앞으로 몇 년간 관계 흐름이 어떻게 변하는지 그래프로도 보여줍니다.

---

## 🛠️ 오늘의 삽질 1 — 대운이 전부 "토"로만 계산되던 버그

대운·세운 기능을 붙이고 나서 뭔가 이상했습니다. 어떤 사주를 넣어도 대운의 십성(비겁/식상/재성/관성/인성) 분포가 유독 한쪽으로 쏠려 보였습니다. 코드를 뜯어보니 원인은 이거였습니다.

```ts
// 버그: 천간 한자를 그대로 두 번 이어붙여 wuxingPair에 넣음
const [ganElement] = wuxingPair(`${gh}${gh}`); // gh: "甲" 같은 간(干) 한자 1글자
```

`wuxingPair()`는 lunar-javascript가 돌려주는 "甲木" 같은 **간+오행 조합 문자열**을 파싱하도록 만든 함수였는데, 여기선 간 한자 하나를 그냥 두 번 이어붙인(`"甲甲"` 같은) 값을 넣고 있었습니다. 당연히 매핑 테이블에 없는 키라 매번 아무 매칭도 안 되고, **조용히 기본값 "토"로 폴백**되고 있었던 겁니다. 에러도 안 나고 화면도 멀쩡하게 뜨니 한동안 못 알아챘습니다.

```ts
// 수정: 천간 한자 -> 오행 매핑을 직접 만들어서 사용
export const GAN_ELEMENT: Record<string, Element> = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
};
const ganElement = GAN_ELEMENT[gh] ?? "토";
```

**"에러 없이 조용히 폴백값을 반환하는 코드"** 가 왜 무서운지 다시 느낀 케이스였습니다. 차라리 매칭 실패 시 예외를 던졌다면 바로 알아챘을 텐데, 항상 그럴듯한 값("토")을 돌려주니 화면만 봐서는 버그인지 알 수가 없었습니다.

## 🛠️ 오늘의 삽질 2 — 요약 카드 다운로드가 안 됨 (html-to-image가 계속 hang)

사주/궁합 결과를 이미지로 저장할 수 있는 기능을 붙이면서, 처음엔 흔히 쓰는 `html-to-image` 라이브러리로 구현했습니다. 실제 DOM 카드를 그대로 캡처해주는 편한 방식이었는데, **이 개발 환경에서 DOM 캡처 단계가 원인 불명으로 계속 멈춰버렸습니다.** 로딩 스피너만 계속 돌고 끝나지 않는 상태였어요.

원인을 더 깊게 파는 대신, **Canvas 2D API로 카드를 직접 그리는 방식**으로 갈아탔습니다. DOM 스냅샷에 의존하지 않고 텍스트·배경·구분선을 좌표 계산해서 코드로 직접 그리니, 비동기 DOM 캡처 단계 자체가 없어서 hang될 지점이 없어졌습니다.

```ts
// lib/canvasCard.ts — DOM 캡처 대신 좌표를 계산해 직접 그림
ctx.fillStyle = "#0f172a";
ctx.fillRect(0, 0, width, height);
ctx.font = "bold 28px sans-serif";
ctx.fillText(title, x, y);
// ...
const dataUrl = canvas.toDataURL("image/png");
```

동기적으로 끝까지 완결되는 방식이라 "원인 모르게 멈추는" 부류의 문제 자체가 원천 차단된다는 게 이 방식의 장점이었습니다. 라이브러리가 편해 보여도, 내부적으로 뭘 하는지 통제가 안 되면 최후의 수단으로 "직접 그리기"가 의외로 제일 안전한 선택일 때가 있다는 걸 배웠습니다.

---

## 3️⃣ 그 외 소소하지만 기억할 버그들

- **드롭다운 순서대로 골랐는데 값이 리셋됨**: 년/월/일을 하나의 문자열로 합쳐 파생시키던 구조라, 년→월→일 순서로 고르면 중간 선택값이 계속 초기화됐습니다. `year`/`month`/`day`를 독립된 state로 분리해서 해결.
- **신살 카드 제목이 오른쪽으로 밀림**: 예전 grid 레이아웃에서 쓰던 `align-self: end`가 이후 flex-column 구조로 바뀌면서도 안 지워진 채 남아 있었습니다. 리팩터링할 때 옛 CSS 잔재를 같이 정리하지 않으면 이렇게 뒤늦게 튀어나옵니다.
- **같은 신살이 중복 카드로 표시됨**: 하나의 신살이 여러 기둥에서 동시에 매칭되는 경우(백호살 등) 카드가 매칭 개수만큼 중복 생성되던 걸, 같은 신살은 한 칸으로 병합하도록 일반화했습니다.

---

## ✅ 마무리

만세력 계산 자체는 `lunar-javascript`가 다 해주지만, 그 위에 오행 상생상극·궁합 점수화·대운/세운 흐름·신살 판별 같은 전통 명리 로직을 하나씩 코드로 옮기는 과정에서 버그가 꽤 나왔습니다. 특히 GAN_ELEMENT 버그처럼 **"에러 없이 그럴듯한 값으로 조용히 폴백하는 코드"** 가 가장 늦게, 가장 찾기 힘들게 발견된다는 걸 다시 확인했습니다. 다음엔 이런 매핑 함수에 "매칭 실패 시 명시적으로 예외를 던지는" 개발용 assert를 기본으로 넣어야겠습니다.

이상입니다 🙌
