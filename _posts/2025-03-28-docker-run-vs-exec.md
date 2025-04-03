---
title: "[STUDY_3] Docker run vs exec - 실무 활용 꿀팁"
date: 2025-03-28 09:00:00 +0900
categories: [Infra_Study]
tags: [Docker, Container, CLI, 실무팁]
---

안녕하세요 멩기입니다.  
최근 Docker에 대해 기본 개념과, 컨테이너 구동과 볼륨 및 네트워크 관리에 대해 다루었습니다.  
하지만 `docker run` 명령어만 안다고 해서 본인의 입맛대로 Docker를 구동시키기란 어렵습니다.

저 또한 실무에서 신규 서버 Host에 직접적으로 컨테이너를 구동시킴에 있어 옵션들의 실수 혹은 누락으로 인해 원하는 대로 컨테이너가 구동되지 않은 경험도 있습니다.

그래서 이번 시간에는 **Docker run의 주요 옵션들**, 그리고 실행시키는 `exec`에 대한 부분을 조금 더 상세하게 다루어보고자 합니다.

---

## 📌 Docker run 자주 사용하는 옵션들

| 옵션명 | 설명 |
|--------|------|
| `-d` | 백그라운드에서 컨테이너 실행 (detached mode) |
| `-it` | 상호작용 가능한 터미널로 실행 (ex. bash shell) |
| `--name` | 컨테이너에 이름 부여 |
| `--rm` | 컨테이너 종료 시 자동 삭제 |
| `-p` | 호스트와 컨테이너 포트 연결 (ex: `-p 8080:80`) |
| `-v` | 볼륨 마운트 (ex: `-v /host/path:/container/path`) |
| `--env`, `-e` | 환경 변수 설정 (ex: `-e VAR=value`) |
| `--network` | 네트워크 설정 (ex: bridge, host, 사용자 정의 등) |
| `--restart` | 재시작 정책 설정 (no, always, on-failure, unless-stopped) |
| `--privileged` | 호스트 권한을 컨테이너에 부여 (주의 필요) |
| `--entrypoint` | 기본 명령어 override |

---

## ✅ docker run 명령어 구조

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]

OPTIONS: 이미지 앞에 와야 함
IMAGE: 반드시 옵션들 뒤에 와야 함
COMMAND와 ARG: 이미지 뒤에 와야 함

❌ 잘못된 예시:
```bash
docker run ubuntu -it /bin/bash

✅ 올바른 예시:

bash
```bash
docker run -it ubuntu /bin/bash
