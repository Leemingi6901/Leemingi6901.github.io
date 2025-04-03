---
title: "[STUDY_5] Cisco 스위치 패스워드 분실 시 초기화 가이드"
date: 2025-04-04 09:00:00 +0900
categories: [Infra_Study]
tags: [Cisco, Switch, Password Recovery, 실무팁]
---

안녕하세요, 멩기입니다.  
오늘은 **Cisco 스위치의 비밀번호를 잊어버렸을 때 초기화하는 절차**에 대해 다뤄보겠습니다. 실무에서 네트워크 장비를 오랫동안 관리하다 보면 로그인 정보가 누락되거나, 인수인계 오류 등으로 접근이 불가능한 상황이 종종 발생합니다.

이번 포스트에서는 Cisco Catalyst 스위치를 기준으로 **콘솔 접속을 통한 비밀번호 복구 절차**를 단계별로 정리하였습니다.

---

## 🧰 사전 준비

- 콘솔 케이블 (RS-232 또는 USB to Serial)
- 터미널 프로그램 (PuTTY, TeraTerm 등)
- Cisco 스위치 전원 재시작 가능 권한

---

## 🛠️ 복구 절차

### ✅ Step 1: 콘솔 케이블 연결 및 재부팅

1. 콘솔 케이블을 이용하여 PC와 Cisco 스위치를 연결합니다.
2. 터미널 프로그램을 실행하고 시리얼 포트를 설정합니다 (9600 bps, 8N1).
3. 스위치의 전원을 껐다가 다시 켜고, **초기 부트 메시지 중 `Mode` 버튼을 누르고 유지**합니다.
    - 구형 모델: `Break` 신호 전송 (보통 Ctrl + Break)
    - 신형 모델: 전면의 `MODE` 버튼을 10~15초간 누르고 있으면 ROMmon 모드 진입

---

### ✅ Step 2: Flash 메모리 마운트 및 설정 파일 우회

```bash
switch: flash_init
switch: dir flash:
switch: rename flash:config.text flash:config.backup
```

> 설정 파일(config.text)의 이름을 변경하여 스위치가 기존 설정을 불러오지 않도록 합니다.

---

### ✅ Step 3: 장비 재부팅 및 설정 모드 진입

```bash
switch: boot
```

- 스위치가 기본 설정 모드로 부팅됩니다.
- `System Configuration Dialog`는 `No`로 입력 후 CLI로 진입합니다.

---

### ✅ Step 4: 기존 설정 복원 및 비밀번호 재설정

```bash
Switch> enable
Switch# rename flash:config.backup flash:config.text
Switch# copy flash:config.text system:running-config
```

- 기존 설정 복원 완료 후, 기존 패스워드가 제거된 상태로 적용됩니다.

```bash
Switch# configure terminal
Switch(config)# enable secret <새로운 패스워드>
Switch(config)# line console 0
Switch(config-line)# password <새로운 콘솔 패스워드>
Switch(config-line)# login
Switch(config-line)# end
```

---

### ✅ Step 5: 설정 저장 및 재부팅 확인

```bash
Switch# write memory
Switch# reload
```

---

## 🚨 주의사항

- 패스워드 초기화는 **물리적 접근이 가능해야만 수행**할 수 있습니다.
- 스위치의 설정이 날아가지 않도록 `config.text`를 삭제하지 말고 반드시 `rename` 명령으로 변경하십시오.
- 보안을 위해 초기화 후 반드시 패스워드를 **강력하게 재설정**하세요.

---

비밀번호 분실은 누구에게나 발생할 수 있는 문제이지만, 위 절차를 숙지하고 있다면 당황하지 않고 안정적으로 대응할 수 있습니다.  
앞으로도 실무에서 바로 적용 가능한 네트워크 관리 팁을 공유드릴 예정이니 많은 관심 부탁드립니다.

감사합니다.  
ⓒ 2025 멩기 블로그
