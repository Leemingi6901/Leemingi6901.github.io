---
layout: post
title: "[daniel.wiki] 히어로 뉴럴 네트워크 리디자인기 — 3D에서 2D 행성 그래프까지"
date: 2026-07-30 20:00:00 +0900
categories: [Project]
tags: [Next.js, Three.js, SVG, React, TypeScript, daniel.wiki]
---

안녕하세요, 멩기입니다.

이번 글은 [daniel.wiki](https://daniel-tech-wiki.vercel.app) 홈 화면 히어로에 있는 카테고리·문서 그래프(뉴럴 네트워크 비주얼)를 여러 라운드에 걸쳐 갈아엎은 기록입니다. 결과물만 보면 "그냥 SVG로 그린 그래프"지만, 거기까지 가는 동안 3D → 2.5D → 2D를 다 거쳤고, 그 사이사이 실제로 겪은 삽질도 있어서 정리해봅니다.

---

## 0️⃣ 시작 — 3D 항성 필드

처음엔 **Three.js + react-three-fiber + drei** 조합으로 제대로 된 3D를 만들었습니다.

- 허브(사이트) → 카테고리 → 문서, 3단 구조를 3D 공간에 배치
- 노드 구체는 커스텀 GLSL 셰이더로 "끓어오르는 항성 표면" 느낌을 냄 (simplex noise + fbm + fresnel 림라이팅)
- 배경엔 나선팔 은하 형태의 파티클 필드(`THREE.Points`, 4200개)
- `OrbitControls`로 자유 드래그 회전 + 스크롤 확대

```glsl
vec3 p = normalize(vPosition) * 2.4 + vec3(0.0, 0.0, uTime * 0.08);
float n = fbm(p) * 0.5 + 0.5;
vec3 color = mix(uColorDark, uColorBright, smoothstep(0.25, 0.85, n));
```

비주얼 자체는 만족스러웠는데, 실사용 관점에서 문제가 두 개 있었습니다.

## 1️⃣ 문제 1 — 스크롤이 캔버스에 붙잡힘

`OrbitControls`가 항상 활성화돼 있으니, 페이지를 스크롤하다가 마우스 포인터가 캔버스 위를 지나가면 스크롤 대신 3D 확대가 되어버렸습니다. 처음엔 "클릭해야 상호작용이 켜지고, 캔버스 밖을 클릭하거나 마우스가 벗어나면 꺼지는" 방식으로 땜빵했습니다.

```tsx
useEffect(() => {
  if (!engaged) return;
  const handlePointerDown = (e: PointerEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setEngaged(false);
    }
  };
  document.addEventListener("pointerdown", handlePointerDown);
  return () => document.removeEventListener("pointerdown", handlePointerDown);
}, [engaged]);
```

동작은 했지만, 근본적으로 "이 영역은 스크롤이 아니라 확대가 된다"는 모드 자체가 사용자 입장에서 직관적이지 않다는 게 문제였습니다.

## 2️⃣ 문제 2 — 3D가 그냥 불편하다는 피드백

"3D는 보기 불편하다"는 피드백을 받고, 자유 회전을 완전히 걷어내고 **2.5D 마우스 패럴랙스**로 바꿨습니다. `OrbitControls`를 지우고, 카메라를 구면 좌표(`THREE.Spherical`)로 다뤄서 마우스 위치에 따라 아주 살짝만(좌우 ±23°, 상하 ±13° 이내) 기울어지고, 손을 떼면 항상 부드럽게 원래 각도로 돌아오게 했습니다.

```tsx
useFrame(() => {
  const targetTheta = base.theta - pointer.current.x * 0.4;
  const targetPhi = clamp(base.phi - pointer.current.y * 0.22, base.phi - 0.3, base.phi + 0.3);
  current.theta += (targetTheta - current.theta) * 0.06;
  current.phi += (targetPhi - current.phi) * 0.06;
  camera.position.setFromSpherical(current);
  camera.lookAt(0, 0, 0);
});
```

드래그도, 확대도 없앴기 때문에 스크롤 캡처 문제도 자연스럽게 같이 해결됐습니다. 클릭-활성화 로직, 바깥 클릭 감지, 힌트 문구까지 전부 필요 없어졌고요.

## 3️⃣ 그래도 부담스럽다 — 3D를 통째로 걷어내다

여기서 한 번 더 피드백이 왔습니다. "2D와 2.5D 사이 그 어디쯤이면 좋겠다"는 것도 아니고, 그냥 **완전 평면 2D + 비정형(organic) 구조**로 가자는 방향이었습니다. `three`/`@react-three/fiber`/`@react-three/drei` 의존성을 이 컴포넌트에서 전부 걷어내고, 순수 SVG로 새로 짰습니다.

카테고리·문서 노드를 완전한 원형 대신 각도·반경에 시드 기반 지터를 줘서 손으로 흩뿌린 듯하게 배치하고, 연결선도 직선 대신 살짝 휘어진 2차 베지어 곡선으로 그렸습니다.

```ts
function categoryPoint(i: number, n: number, w: number, h: number): Pt {
  const baseAngle = (i / n) * Math.PI * 2 - Math.PI / 2;
  const jitter = (pseudo(i * 13.7 + 1) - 0.5) * 0.55;
  const angle = baseAngle + jitter;
  const rx = w * 0.3 * (0.8 + pseudo(i * 7.3 + 2) * 0.4);
  const ry = h * 0.32 * (0.8 + pseudo(i * 5.1 + 3) * 0.4);
  return clampPoint({ x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry }, w, h, margin);
}
```

WebGL이 아니라 그냥 DOM/SVG라서, 카메라나 렌더 루프 없이도 서버에서 렌더링할 수 있게 됐고 모바일 성능 걱정도 사실상 사라졌습니다. 반응형은 `ResizeObserver`로 컨테이너의 실제 픽셀 크기를 재서 그대로 `viewBox`로 써서, 화면 비율이 아무리 달라져도 레터박스(빈 여백) 없이 항상 꽉 차게 만들었습니다.

## 🛠️ 오늘의 삽질 — SSR/클라이언트 하이드레이션 불일치

2D로 바꾸고 콘솔을 열어봤더니 이런 경고가 떴습니다.

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
+ d="M 450 250 Q 497.0364655599632 177.22013004251698 501.06930457228583 90.6575817152962"
- d="M 450 250 Q 497.0364655598729 177.2201300424926 501.06930457210524 90.6575817152962"
```

두 값이 소수점 **10자리쯤**에서 미세하게 다릅니다. 서버(Node.js)와 클라이언트(브라우저)가 같은 좌표 계산식(`Math.cos`/`Math.sin`/`Math.hypot`을 여러 번 체이닝)을 돌렸는데도 결과가 완전히 똑같지는 않았던 겁니다. 두 환경 모두 V8이지만, 서로 다른 빌드/버전이라 초월함수(sin/cos) 결과가 ULP 단위로 갈릴 수 있고, 이게 여러 연산을 거치며 누적된 것으로 보입니다.

시각적으로는 전혀 티가 안 나는 차이지만(1e-10 수준), React의 하이드레이션 비교는 문자열이 한 글자라도 다르면 그대로 잡아냅니다. 해결은 간단했습니다 — 좌표를 그리기 직전 소수 둘째 자리로 반올림.

```ts
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
```

`curvePath`, `categoryPoint`, `leafPoint` 등 좌표를 만드는 모든 함수의 출력에 이걸 적용하니 경고가 완전히 사라졌습니다. 서버·클라이언트가 각자 다른 부동소수점 오차를 갖고 있더라도, 화면에 그릴 필요가 있는 정밀도(0.01)보다 훨씬 작은 오차라 반올림으로 흡수해버리면 그만이라는 걸 새삼 확인한 케이스였습니다.

## 4️⃣ 라벨이 서로 겹쳐서 안 보이는 문제

문서가 많은 카테고리(예: 인프라·클라우드 7개)는 완전 무작위 각도로 문서 노드를 흩뿌리다 보니 우연히 한쪽으로 몰려서 라벨이 겹치는 일이 잦았습니다. 두 가지로 잡았습니다.

1. **균등 슬롯 배치** — 완전 랜덤 각도 대신, 문서 개수만큼 각도를 고르게 나눈 슬롯에 배정하고 그 안에서만 살짝 흔들리게 바꿈. 반경도 문서 수에 비례해서 넓힘.
2. **기본적으로 숨기고 호버 시에만 표시** — 문서 라벨은 평상시 `opacity: 0`으로 숨겨두고, 호버(또는 탭)했을 때만 나타나게 함. 평상시엔 허브 1개 + 카테고리 4개, 딱 5개 라벨만 보이니 겹칠 일 자체가 없어짐.

```ts
function leafPoint(center: Pt, index: number, count: number, seedBase: number, w: number, h: number): Pt {
  const baseAngle = (index / count) * Math.PI * 2;
  const jitter = (pseudo(seedBase + index * 3.1) - 0.5) * (Math.PI / count) * 1.3;
  // ...
}
```

## 5️⃣ 너무 밋밋하다 — z-depth 레이어

완전 평면 SVG로 가니 이번엔 "너무 납작하다"는 피드백이 왔습니다. 카메라나 회전 없이도 입체감을 줄 방법이 필요했는데, 각 노드에 **고정된 가상의 깊이값(z)** 을 부여하는 방식을 썼습니다.

- z가 클수록(카메라에 가까울수록) 노드를 크고 밝고 선명하게
- z가 작을수록(멀수록) 작고 흐릿하고 살짝 블러(피사계심도) 처리
- 그리는 순서도 z가 작은 노드부터 그려서, 겹칠 때 가까운 노드가 자연스럽게 위에 놓이도록 정렬

```ts
function depthScale(z: number) { return 0.68 + z * 0.5; }
function depthOpacity(z: number) { return 0.55 + z * 0.45; }
function depthBlur(z: number) { return Math.max(0, (0.82 - z) * 3); }
```

회전하지 않는 정적인 장면인데도, 크기·밝기·흐림 정도만으로 꽤 그럴듯한 레이어드 깊이감이 생겼습니다.

## 6️⃣ 마지막 — "행성 이미지 느낌으로"

가장 최근 요청은 노드를 평평한 원이 아니라 **행성처럼** 보이게 하고, 애니메이션도 넣어달라는 것이었습니다.

**구체 셰이딩**은 방사형 그라디언트의 중심을 살짝 한쪽으로 옮겨서 만들었습니다. 광원이 한쪽에서 비추는 것처럼 밝은 하이라이트 → 원래 색 → 가장자리 어두운 그림자로 이어지게 하면, 그것만으로 원이 구체처럼 보입니다.

```tsx
<radialGradient id="planet-accent" cx="36%" cy="32%" r="75%">
  <stop offset="0%" stopColor={mix(color, "#ffffff", 0.7)} />
  <stop offset="45%" stopColor={color} />
  <stop offset="100%" stopColor={mix(color, "#000000", 0.58)} />
</radialGradient>
```

여기에 노드 위치는 그대로 두고, 코어 원만 감싼 내부 `<g>`에 아주 느린(30~90초) CSS 회전 애니메이션을 걸어서 하이라이트가 표면을 스치듯 자전하게 했습니다. 허브에는 토성 같은 얇은 고리와 은은한 펄스를, 허브→카테고리 연결선에는 SVG `<animateMotion>`으로 작은 빛 입자가 흐르는 효과를 추가했습니다(JS 프레임 루프 없이 순수 선언형 애니메이션이라 성능 부담이 없습니다).

```tsx
<circle r={2.2} className="nx-edge-pulse" fill={ACCENT}>
  <animateMotion dur="4s" begin="0s" repeatCount="indefinite" path={catEdgeD} />
</circle>
```

노드의 **위치 자체는 절대 움직이지 않게** 한 게 포인트였습니다. 위치를 흔들면 연결선(고정된 좌표로 그려진 `<path>`)이 노드에서 떨어져 보이는 버그가 생기기 때문에, 회전/펄스/데이터 흐름은 전부 위치와 무관한 시각 효과로만 구현했습니다.

## 그 외 같이 정리한 것들

같은 기간에 홈페이지 전반도 몇 가지 손봤습니다.

- 카테고리 카드를 데스크톱에서 한 줄(4열)로, 문서 리스트는 다시 세로 스택으로 정렬
- 홈 랜딩(`.nx`)과 위키 읽기 페이지(`.site-*`)가 서로 다른 배경/강조색을 쓰던 걸 별 + 성운 배경, 시안 계열 강조색으로 통일
- 문서 리스트 항목이 좁은 화면에서 제목·설명·메타정보가 겹쳐 보이던 버그 수정 (가로 배치 → 세로 스택)

---

## ✅ 마무리

한 문장으로 요약하면 **"기술적으로 화려한 것"과 "실제로 쓰기 편한 것" 사이에서 계속 좁혀나간 과정**이었습니다. 3D 항성 필드는 만들 때는 재밌었지만 실사용성에서 밀렸고, 결국 가장 단순한 기술(SVG)로 돌아와서 디테일(깊이감, 구체 셰이딩, 절제된 애니메이션)을 쌓는 쪽이 더 만족스러운 결과로 이어졌습니다. 매 라운드 실제로 써보고 피드백을 주고받는 과정 자체가 가장 값진 부분이었던 것 같습니다.

결과물은 [daniel-tech-wiki.vercel.app](https://daniel-tech-wiki.vercel.app)에서 바로 확인하실 수 있습니다.

이상입니다 🙌
