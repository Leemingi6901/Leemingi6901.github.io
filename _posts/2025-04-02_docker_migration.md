---
title: "[STUDY_4] Docker 백업 및 마이그레이션 실전 가이드"
date: 2025-04-02 09:00:00 +0900
categories: [Infra_Study]
tags: [Docker, Backup, Migration, 실무팁]
---

안녕하세요.  
어느덧 Docker 3편까지 왔습니다.  
저도 도커에 대해 계속 공부하고 있고 조금 더 자유롭게 다루기 위해서 노력을 하고 있습니다.

현재 저는 프라이빗클라우드 환경에서 서버를 관리하고있습니다.  
최근 Cent OS EOS로 인하여 Rocky 8 Linux로 전부 마이그레이션을 하고 있고  
이 과정에서 구동중이던 도커 컨테이너를 새로 올려야 하는 상황에 맞이하게 되었습니다.

저와 같은 환경에 처한 사람들을 위해 **도커 마이그레이션 관련 가이드를 제공**해드리고자 합니다.  
마이그레이션 이후 이미지를 불러와서, 서버에 컨테이너를 구동하는 `run`과 `exec` 명령어는 이전에 다루었으니 이번에는  
**도커를 백업하는 방법과 백업한 이미지를 불러오는 방법들**을 다루어보겠습니다.

---

## ✅ 1. Docker 데이터 구성요소 이해

- **Docker 이미지 (images)**: 컨테이너 실행의 기반  
- **Docker 컨테이너 (containers)**: 실행 중인 서비스  
- **Docker 볼륨 (volumes)**: 데이터가 저장되는 곳 (DB 등)  
- **Docker 네트워크 (networks)**: 컨테이너 간 통신 구성  
- **Docker Compose 파일**: 서비스 정의 스크립트 (`docker-compose.yml`)

---

## ✅ 2. 실제 백업 절차

### 🧱 (1) 이미지와 컨테이너 목록 저장

```bash
docker images > docker_images_list.txt
docker ps -a > docker_containers_list.txt
```

### 📦 (2) Docker 이미지 저장 (백업)

```bash
docker save -o my_image.tar <이미지 이름>:<태그>
```

### 🚚 (3) 볼륨 데이터 백업

```bash
docker run --rm -v <볼륨 이름>:/volume -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /volume
```

### 🚚 (4) docker-compose.yml 백업

- Git에 있는 경우도 많으며 복사해두기만 하면 됨.

> 개인적으로 내가 직접 구축하고 옵션을 설정한 서버가 아니라면  
> **Compose로 컨테이너를 구동하는게 훨씬 좋다**고 생각합니다.

---

## ✅ 3. 새로운 서버에서 복원 절차

### 📥 (1) 이미지 불러오기

```bash
docker load -i my_image.tar
```

### 💾 (2) 볼륨 복원

```bash
docker volume create <볼륨 이름>
docker run --rm -v <볼륨 이름>:/volume -v $(pwd):/backup alpine sh -c "cd /volume && tar xzf /backup/backup.tar.gz"
```

### 🚀 (3) 컨테이너 재생성

```bash
docker-compose up -d
```

> 대부분 위의 방법으로 백업받은 도커를 구동시키는데 문제가 없습니다.

---

## ✅ 4. Docker Inspect 백업

- 설정 정보 보존 및 디버깅에 매우 유용함

```bash
docker inspect <컨테이너 이름 또는 ID> > container_inspect_backup.json
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' <컨테이너명> > env.txt
```

### 🔍 주로 확인하는 정보들

| 항목 | 설명 |
|------|------|
| `Config.Env` | 환경 변수 |
| `NetworkSettings.IPAddress` | 컨테이너 IP |
| `Mounts` | 마운트 정보 |
| `State` | 컨테이너 상태 |
| `HostConfig.PortBindings` | 포트 바인딩 |
| `LogPath` | 로그 경로 |
| `Created` | 생성 시간 |
| `Path / Args` | 실행 명령어 |

---

## ✅ 5. 주의사항

- DB 등 중요 정보는 volume tar 백업 필수  
- `docker inspect`로 설정 정보 저장 권장  
- 왠만하면 `docker save/load` 사용  
- 네트워크도 필요시 `docker network inspect` 백업  

> 도커 자체를 백업하고 다시 로드하는 것은 어렵지 않지만,  
> 안정적인 복원을 위해서는 평소부터 **주기적인 백업 습관**이 중요합니다.  
> `crontab`을 이용해 자동화해두는 것도 추천합니다.

---

감사합니다.  
ⓒ 2025 멩기 블로그
