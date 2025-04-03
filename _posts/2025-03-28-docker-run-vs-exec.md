---
title: "[STUDY_3] Docker run vs exec - 실무 활용 꿀팁"
date: 2025-03-28 09:00:00 +0900
categories: [Infra_Study]
tags: [Docker, Container, CLI, 실무팁]
---

# Docker의 기본 개념과 주요 명령어

안녕하세요, 멩기입니다.  
최근 Docker에 대해 기본 개념과 컨테이너 구동, 볼륨 및 네트워크 관리에 대해 다루었습니다. 하지만 단지 `docker run` 명령어만 알고 있다고 해서 본인의 입맛대로 Docker를 구동시키는 것은 어렵습니다.

저 또한 실무에서 신규 서버 호스트에 직접적으로 컨테이너를 구동시키면서, 옵션의 실수나 누락으로 인해 원하는 대로 컨테이너가 구동되지 않은 경험이 있습니다. 그래서 이번 시간에는 `docker run`의 주요 옵션들과 실행 시 사용하는 `exec` 명령어에 대해 조금 더 상세하게 다루어보겠습니다.

## 📌 Docker run 자주 사용하는 옵션들

| 옵션명        | 내용                                                |
|---------------|-----------------------------------------------------|
| `-d`          | 백그라운드에서 컨테이너 실행 (detached mode)      |
| `-it`         | `-i` + `-t`: 상호작용 가능한 터미널로 실행 (ex. bash shell) |
| `--name`      | 컨테이너에 이름 부여                              |
| `--rm`        | 컨테이너 종료 시 자동 삭제                        |
| `-p`          | 호스트와 컨테이너 포트 연결 (ex: `-p 8080:80`)   |
| `-v`          | 볼륨 마운트 (ex: `-v /host/path:/container/path`) |
| `--env` 또는 `-e` | 환경 변수 설정 (ex: `-e VAR=value`)              |
| `--network`   | 네트워크 설정 (ex: bridge, host, none, 사용자 정의 네트워크) |
| `--restart`   | 재시작 정책 설정 (ex: no, always, on-failure, unless-stopped) |
| `--privileged`| 호스트의 모든 권한을 컨테이너에 부여 (주의 필요)  |
| `--entrypoint`| 기본 명령어를 override                             |

사실 옵션들을 알아도 어디서 어떻게 배열해서 쓰는지가 중요합니다. 간단한 예제를 통해 안내드리겠습니다. 추가 옵션들에 대해서는 순서에 크게 구애받지 않습니다. 볼륨 마운트 뒤에 호스트 포트 연결 옵션이 와도 상관없고, 호스트 포트 연결 옵션 뒤에 볼륨 마운트가 와도 상관 없습니다. 다만, 명령어 구조 안에서 각 요소가 위치해야 할 자리는 정해져 있습니다.

### ✅ 구조적으로 중요한 위치

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

- **OPTIONS**: 이미지 앞에 와야 함
- **IMAGE**: 반드시 옵션들 뒤에 와야 함
- **COMMAND와 ARG**: 이미지 뒤에 와야 함

### ❌ 잘못된 예시

```bash
docker run ubuntu -it /bin/bash # ❌ 옵션 -it이 IMAGE 뒤에 와서 에러 가능성 있음
```

### ✅ 올바른 예시

```bash
docker run -it ubuntu /bin/bash
```

### 🎯 요약

옵션 → 이미지 → 명령어 순서만 잘 지키면 OK.  
옵션들끼리는 순서 바뀌어도 OK.

위 내용은 대체로 많이 사용하시는 Docker run에 대한 내용이었습니다. 하지만 최근 GPU 사용을 하는 업체가 많아졌고, GPU 사용 시 Docker run에 추가되는 옵션들이 더 발생하게 됩니다.

## ✅ NVIDIA GPU를 쓸 때 필수 전제

1. NVIDIA 드라이버는 호스트에 설치되어 있어야 함
2. `nvidia-docker2` 또는 `nvidia-container-toolkit`이 설치되어 있어야 함

설치가 끝났다면, GPU 옵션을 다음과 같이 `docker run`에 추가하면 됩니다.

### 🔧 GPU 사용 옵션 기본 형식

```bash
docker run --gpus all nvidia/cuda:12.2.0-base nvidia-smi
```

| 옵션                     | 설명                                     |
|--------------------------|------------------------------------------|
| `--gpus all`             | 사용 가능한 모든 GPU 사용              |
| `--gpus "device=0"`      | 특정 GPU만 사용 (예: GPU 0번)          |
| `--runtime=nvidia`       | 예전 방식 (요즘은 대부분 자동 설정되므로 생략 가능) |
| `-e NVIDIA_VISIBLE_DEVICES=0` | 환경변수로 GPU 제어 (복수 지정 가능: 0,1) |
| `-v /usr/local/cuda:/usr/local/cuda` | 필요 시 CUDA 경로 마운트 (일부 이미지에서 필요) |

GPU 관련 설치 확인:
```bash
nvidia-smi
```

## 🧭 docker exec 사용법

```bash
docker exec [OPTIONS] CONTAINER COMMAND [ARG...]
```

가장 일반적인 예시:
```bash
docker exec -it mycontainer bash
```

### 🧪 exec 활용 예시

- 컨테이너 내 파일 확인:
  ```bash
  docker exec mycontainer ls /app/logs
  ```

- 특정 사용자로 명령 실행:
  ```bash
  docker exec --user www-data mycontainer whoami
  ```

- 간단한 상태 확인:
  ```bash
  docker exec mycontainer ps aux
  ```

### ❗️ 주의할 점

- `docker exec`은 **컨테이너가 실행 중일 때만 사용 가능**  
- 종료된 컨테이너는 `docker start`로 다시 실행해야 함

### 🔧 exec 자주 사용하는 옵션

| 옵션          | 설명                                                  |
|---------------|-------------------------------------------------------|
| `-i`          | 표준 입력(입력 대기)을 활성화                       |
| `-t`          | 가상 터미널 할당 (셸 실행할 때 필요)                 |
| `-it`         | `-i` + `-t` 조합                                     |
| `-e`          | 실행 시 환경 변수 지정                                |
| `--privileged`| 높은 권한으로 실행                                   |
| `--user`      | 특정 사용자로 실행 (예: `--user root`)              |

## 🤖 docker exec vs docker run

| 비교         | `docker run`                 | `docker exec`              |
|--------------|-------------------------------|----------------------------|
| 컨테이너     | 새로 생성해서 실행           | 기존 컨테이너에 명령 실행  |
| 용도        | 앱 실행, 새 환경 구성         | 디버깅, 점검 등            |
| 리소스      | 새로운 PID/환경               | 기존 내부에서 실행         |

---

이렇게 오늘은 `docker run`과 `docker exec`에 대해 실무적인 관점에서 정리해보았습니다.  
다음에는 컨테이너 디버깅이나 로그 확인 등 **운영 환경에서 유용한 Docker 활용법**을 다뤄보겠습니다.

감사합니다 🙌  
ⓒ 2025 멩기 블로그
