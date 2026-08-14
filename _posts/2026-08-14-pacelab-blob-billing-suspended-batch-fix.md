---
layout: post
title: "[PaceLab] 어느 날 갑자기 빈 화면 — Vercel Blob 정지 사건과 배치 처리로 고친 이야기"
date: 2026-08-14 10:00:00 +0900
categories: [Project]
tags: [PaceLab, Vercel, Blob-Storage, GitHub-Actions, Python, TypeScript]
---

안녕하세요, 멩기입니다.

[지난 글](/posts/pacelab-training-score-garmin-sync/)에서 가민 자동 동기화까지 붙여놓고 잘 쓰고 있었는데, 어느 날 사이트에 들어가보니 대회 기록도 훈련 로그도 전부 "아직 기록이 없습니다"로 텅 비어 보였습니다. 데이터를 지운 적도 없는데 말이죠. 원인을 추적해보니 코드 버그가 아니라 **Vercel Blob 스토어가 결제 문제로 조용히 정지**돼 있었고, 그 결제 정지의 진짜 원인을 더 파고들어보니 제가 짠 동기화 로직 구조 자체에 있었습니다.

---

## 1️⃣ 증상 — 에러 하나 없이 그냥 빈 화면

제일 헷갈렸던 건 **에러 메시지가 하나도 없었다**는 점입니다. 콘솔도 깨끗하고, 페이지도 200으로 잘 뜨는데 내용만 텅 비어있었습니다. 원인은 데이터 조회 함수를 이렇게 짜둔 탓이었습니다.

```ts
export async function getData(): Promise<PaceLabData> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 30 });
    // ...
  } catch {
    return DEFAULT_DATA; // 실패하면 그냥 빈 기본값
  }
}
```

Blob 접근이 실패하면 에러를 던지는 대신 조용히 빈 데이터로 폴백하도록 짜뒀던 게, 정작 진짜 장애 상황에서는 "고장났다"는 신호 자체를 삼켜버리는 역효과를 낸 겁니다.

## 2️⃣ 원인 추적 — Vercel CLI로 직접 파봤다

Vercel 대시보드의 사용량 그래프에서 스토어 두 개가 보였는데, 하나는 이미 삭제된 상태였고 지금 실제로 연결된 스토어가 뭔지 헷갈렸습니다. `vercel` CLI로 직접 확인했습니다.

```bash
$ vercel blob list-stores

  Name            ID                       Status        Region   Size       Files
  pacelab-store   store_fyHFRTCLhxFqCFTt   ● Suspended   iad1     71.11KB    3
```

**Suspended.** 상세 정보를 더 파보니:

```bash
$ vercel blob get-store store_fyHFRTCLhxFqCFTt

Blob Store: pacelab-store
Billing State: Inactive
```

`Billing State: Inactive` — 결제 계정 문제였습니다. 파일 3개(71.11KB) 그대로 남아있는 걸로 봐서 데이터가 삭제된 건 아니고, 그냥 결제 수단이 막혀서 접근 자체가 차단된 상태였습니다.

## 3️⃣ "근데 46건이면 별거 아닌데?" — 진짜 원인은 스파이크였다

Vercel Blob Hobby(무료) 플랜은 월 10,000 Advanced Operations(list/put/copy)가 기본 포함입니다. 평소 사용량 그래프를 보면 하루 46건 정도였는데, 이 정도면 한도의 0.5%도 안 됩니다. "이게 왜 정지될 정도로 문제였지?" 싶었는데, 특정 날짜 몇 개를 찍어보니 **하루 400건 넘게 쓴 날**이 여러 번 있었습니다.

GitHub Actions 로그를 뒤져서 확실한 증거를 찾았습니다.

```bash
$ gh run view <run-id> --log | grep 최근

최근 1095일: 러닝 활동 64건 발견
```

과거 기록을 백필하려고 `days_back=1095`(3년치)로 수동 실행한 적이 있었는데, 이때 발견된 활동 64건을 **하나씩 개별 API 호출**로 저장하고 있었던 겁니다. 다른 날짜(415건)는 더 이상했습니다 — 확인해보니 **가민 동기화 워크플로우 자체가 그 시점엔 아직 존재하지도 않았습니다.** `git log`로 그날 커밋을 찾아보니, 훈련 부하 모델·훈련 추천·주기화 훈련 계획 등 기능을 하루에 8개나 만들고 `/admin`에서 직접 테스트해보던 날이었습니다. 기능 하나 테스트할 때마다 진짜 프로덕션 API를 때렸으니, 그 하나하나가 다 카운트된 거죠.

## 4️⃣ 구조적 문제 — 저장 한 번에 Blob Operation 3건

왜 이렇게 숫자가 쉽게 불어나는지 코드를 보니 이유가 명확했습니다.

```ts
export async function getData(): Promise<PaceLabData> {
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 30 }); // 1건
  // ...
}

export async function saveData(data: PaceLabData): Promise<void> {
  await put(`${BLOB_PREFIX}${version}.json`, ...); // 1건
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 50 }); // 정리용, 1건
  // ...
}
```

`/api/data`에 POST 한 번(활동 하나 저장) 보낼 때마다 `getData()`의 `list()` 1건 + `saveData()`의 `put()`/`list()` 2건, 총 **3건이 고정으로 붙습니다.** 평소엔 하루 3~4건 활동 × 하루 4번(6시간 주기) 동기화라 별 문제가 아닌데, 백필처럼 활동을 N개 발견하면 저장 비용도 그대로 N배로 곱해지는 구조였던 겁니다.

## 5️⃣ 고친 것 — 개별 POST를 배치 하나로

핵심 아이디어는 간단합니다. **활동이 몇 개든 서버에 보내는 저장 요청은 한 번으로 묶는다.** `/api/data`에 배치 타입을 추가했습니다.

```ts
if (body.type === "batch") {
  const data = await getData(); // list 1건
  for (const e of body.entries ?? []) applyTrainingEntry(data, e);
  data.trainings.sort((a, b) => a.date.localeCompare(b.date));
  if (body.vo2max) { /* ... */ }
  await saveData(data); // put + list = 2건
  // 활동이 1개든 64개든 총 3건 고정
}
```

파이썬 동기화 스크립트 쪽도 활동을 발견할 때마다 바로 보내는 대신, 전부 모아뒀다가 한 번에 보내도록 바꿨습니다.

```python
entries = collect_activities(api, race_dates, days_back)  # 모으기만 함, 전송 안 함
vo2max = find_vo2max(api)

payload = {"pin": pin, "type": "batch", "entries": entries}
if vo2max:
    payload["vo2max"] = vo2max

r = requests.post(f"{base_url}/api/data", json=payload, timeout=30)  # 한 번만 전송
```

이러면 평소 3건짜리 정기 동기화는 4건 → 12건이던 게 소폭 줄어들고, 64건짜리 백필은 195건 → **3건**으로 확 줄어듭니다.

## 🛠️ 오늘의 삽질 — 실제 서비스에 테스트 데이터를 넣을 뻔했다

코드를 고치고 나서 바로 실제 API에 테스트 POST를 날려서 검증하고 싶었는데, 잠깐 멈췄습니다. 지금 스토어가 결제 정지 상태라 어차피 실패할 거고, 설령 결제가 복구된 뒤라도 **제 진짜 훈련 기록이 저장된 곳에 더미 데이터를 넣는 건 위험한 검증 방법**이었습니다. 대신 타입 체크와 코드 리뷰로 구조적 정합성만 확실히 하고, 실제 확인은 다음 정기 동기화가 자연스럽게 돌 때 로그로 지켜보기로 했습니다. "고쳤으면 바로 실제로 찔러보고 싶다"는 조급함과 "실제 데이터를 오염시키면 안 된다"는 원칙이 부딪힐 땐 후자를 따라야 한다는 걸 다시 배웠습니다.

## ✅ 마무리

빈 화면 → 에러 없음 → 결제 정지 → 사용량 스파이크 → 구조적 원인, 이렇게 한 단계씩 파고들어야 했던 사건이었습니다. 정작 진짜 문제는 "얼마나 썼냐"가 아니라 "어떻게 썼냐"였네요 — 활동 하나마다 API 호출 하나씩 대응시키는 게 당장은 제일 쉬운 구현이지만, 백필이나 몰아서 테스트하는 상황에서 비용이 그대로 배수로 튄다는 걸 처음부터 염두에 뒀어야 했습니다. 다음에 뭔가 "N개를 반복 저장"하는 로직을 짤 땐, 애초에 배치로 설계하는 습관을 들여야겠습니다.

이상입니다 🙌
