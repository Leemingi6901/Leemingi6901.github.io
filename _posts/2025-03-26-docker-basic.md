---
layout: post
title: "[STUDY_2] 도커(Docker) 기본 명령어와 사용시 주의사항"
date: 2025-03-26 09:00:00 +0900
categories: [Infra_Study]
tags: [docker, container, cli, infra, study]
---
---
title: "[STUDY_2] 도커(Docker) 기본 명령어와 사용시 주의사항"
date: 2025-03-22 09:00:00 +0900
categories: [Infra_Study]
tags: [Docker, Container, CLI, 기초학습]
---

안녕하세요. 멩기입니다.

요즘 클라우드를 떠나 인프라 관리자라면 누구나 학습해야 할 필수 내용이 도커(Docker)라고 생각합니다.

제가 금융권에 있으면서 도커는 연구개발 하시는 개발자들도 '기본적으로' 다룰 줄 아는 프로그램입니다.  
깊게 들어가면 쿠버네티스(Kubernetes, K8s) 위에 도커 컨테이너를 구축하는 분들도 많습니다.

장단점이 존재하겠지만 이번 게시글에서는 도커에 대한 이야기를 집중적으로 다루어보겠습니다.  
다음에 기회가 된다면 쿠버네티스에 대해 공부하며 도커와 연관성, 그리고 구축 방법 등에 대해서도 상세하게 다루어보겠습니다.

---

## 🐳 Docker 초보자를 위한 핵심 가이드

Docker는 최근 클라우드 및 컨테이너 환경에서 필수적인 기술로 자리 잡았습니다.  
이 글에서는 Docker를 처음 접하는 분들을 위해 **기초부터 실무 활용 팁까지** 보기 쉽게 정리했습니다.

---

## 1. Docker란 무엇인가?

Docker는 애플리케이션을 **'컨테이너'라는 독립적인 단위**로 패키징하여 배포, 관리할 수 있도록 도와주는 플랫폼입니다.  
컨테이너는 가볍고 빠르며, 환경에 관계없이 **동일한 동작을 보장**합니다.

---

## 2. Docker 주요 명령어

Docker는 CLI를 통해 조작합니다.  
자주 사용하는 필수 명령어를 실무 예시와 함께 정리했습니다.

### 🔹 이미지 관리

```bash
# 이미지 다운로드
docker pull <이미지>:<태그>

# 이미지 목록 확인
docker images
docker image ls

# Dockerfile을 기반으로 이미지 생성
docker build -t myimage:latest .

# 이미지 삭제
docker rmi <이미지 ID>

# 이미지 상세 정보 확인
docker inspect <이미지 ID>

# 이미지 생성 히스토리 조회
docker history <이미지 ID>
```

### 🔹 컨테이너 관리

```bash
# 컨테이너 생성 및 실행
docker run -d -p 80:80 --name web nginx

# 실행 중인 컨테이너 확인
docker ps

# 중지된 컨테이너 포함 전체 조회
docker ps -a

# 컨테이너 중지
docker stop <컨테이너 ID>

# 컨테이너 강제 종료
docker kill <컨테이너 ID>

# 컨테이너 삭제
docker rm <컨테이너 ID>

# 컨테이너 내부 접속
docker exec -it <컨테이너 ID> /bin/bash

# 컨테이너 로그 출력
docker logs -f <컨테이너 ID>

# 컨테이너 상세 정보 확인
docker inspect <컨테이너 ID>

# 컨테이너 리소스 사용량 모니터링
docker stats
```

### 🔹 볼륨 및 네트워크 관리

```bash
# 볼륨 생성
docker volume create myvolume

# 볼륨 목록 확인
docker volume ls

# 네트워크 생성
docker network create mynetwork

# 네트워크 목록 확인
docker network ls

# 네트워크에 연결된 컨테이너 실행
docker run -d --network mynetwork --name web nginx
```

### 🔹 리소스 정리

```bash
# 사용하지 않는 모든 리소스 정리 (주의!)
docker system prune

# 사용하지 않는 이미지 정리
docker image prune

# 중지된 컨테이너 정리
docker container prune
```

---

## 3. Docker 사용 시 주의사항

- **데이터 휘발성 주의**: 컨테이너 종료 시 데이터 삭제됨 → `-v` 옵션 활용
- **이미지 및 디스크 관리**: 불필요한 이미지 주기적 삭제, 멀티 스테이지 빌드 활용
- **네트워크 관리**: 포트 충돌 방지 및 네트워크 구성 명확히
- **보안**: Dockerfile에 민감 정보 포함 금지 → Secret 도구 사용

---

## 4. 커뮤니티와 학습 커뮤니케이션

- 공식 포럼, Slack, Reddit 등 활발한 커뮤니티
- 오픈소스 기여: 실제 코드 참여 및 문서 작업
- 스터디/세미나 참여: 실무 지식 교류

---

## 5. 학습 로드맵 예시

1. **기초**: 컨테이너 개념, Docker 기본 명령어 숙지 → Dockerfile 실습  
2. **심화**: 볼륨/네트워크/Compose → 멀티 스테이지 빌드, 배포 자동화  
3. **확장**: Swarm, Kubernetes 등 오케스트레이션 학습  
4. **운영/보안/최적화**: 모니터링, 로깅, CI/CD 통합

---

도커는 **리눅스처럼 손에 익는 것이 중요**합니다.  
암기보다는 반복 실습을 통해 **몸으로 익히는 것**이 실무에 큰 도움이 됩니다.

💡 **개인적으로는 VM 환경을 직접 구성해서 컨테이너를 빌드/배포**해보는 것을 추천합니다.  
이 과정을 통해 실무에서 도커를 다루는 감각을 자연스럽게 익힐 수 있습니다.

기초에 익숙해진다면 점점 더 **다중 컨테이너 아키텍처, 자동화 배포** 등으로 확장해 나갈 수 있으니,  
**너무 조급해하지 말고 한 단계씩 천천히 익혀 나가시길 바랍니다!**

---

ⓒ 2025 멩기 블로그

