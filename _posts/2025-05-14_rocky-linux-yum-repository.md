---
layout: post
title: "[STUDY_8] Rocky Linux YUM Repository 구성 가이드[내부망]"
date: 2025-05-14 09:00:00 +0900
categories: ['Infra_Study']
tags: [Linux, Rocky, Yum, Repo, Repository, 인프라, Infra]
---
> 이 글은 외부 인터넷이 차단된 폐쇄망(air-gapped) 환경에서 **Rocky Linux YUM 저장소(Repo)** 를 구성하는 과정을 설명합니다. 내부망 서버에 필요한 패키지를 제공하고, 안정적인 시스템 패치와 패키지 관리를 위해 사용됩니다.

---

## ✨ 인사말 및 배경

안녕하십니까, 멩기입니다. 👋

망분리 환경에서 근무해보신 분이라면 내부망 서버 관리의 어려움을 한 번쯤 겪어보셨을 겁니다. 
망간자료전송시스템(DTMS)이 구축되어 있다고 하더라도, Linux 기반 서버의 경우 별도의 YUM Repository 구성이 필요하다는 점은 여전히 유효합니다.

인터넷이 연결된 일반적인 서버에서는 `dnf install`, `yum install`, `apt-get install` 과 같은 명령어가 문제 없이 작동합니다. 그러나 폐쇄망에서는 이러한 명령어가 작동하지 않으며, 오류 메시지를 마주하게 됩니다.

저 또한 금융권에 근무하며 총 4개의 망을 관리하고 있으며, 주요 서버는 업무망(내부망)에 위치해 있습니다. 최근 진행된 마이그레이션 과정 중 내부망에 `pip` repository가 아닌 `yum` repository 구성을 요청받았고, 이에 따라 작업을 수행하게 되었습니다.

이번 포스팅에서는 **외부망에서 패키지를 수집하고, 이를 tar.gz 형식으로 압축해 내부망에서 YUM 저장소를 구성하는 전체 과정**을 설명드립니다.

---

## 🚀 사전 준비

외부망이 연결된 Windows 또는 Linux 환경에서 Docker를 사용해 작업을 수행할 수 있습니다. 
Linux에서 Docker 설치는 [이전 게시글](#)을 참고해주세요.

### ☕ Windows 환경

Windows에서는 Docker Desktop을 사용해야 합니다. 설치 방법은 아래와 같습니다:

1. [https://www.docker.com](https://www.docker.com) 접속
2. **Download Docker Desktop** 클릭 후 본인의 OS 환경에 맞는 파일 다운로드
3. 설치 후 회원가입 및 로그인
4. Docker 실행 후 원하는 OS 이미지 다운로드 및 컨테이너 실행

> 예: `rockylinux:8.6` 이미지를 사용

Docker 설치 및 실행 후, PowerShell 혹은 CMD에서 다음 명령으로 컨테이너에 접근합니다:

```bash
docker exec -it <container_name> /bin/bash
```

---

## 📂 1. 외부망에서 YUM 저장소 데이터 수집

이제 내부망에 구축할 저장소를 외부망에서 수집합니다:

```bash
mkdir -p /repo/BaseOS
cd /repo/BaseOS

wget --no-check-certificate -r -np -nH --cut-dirs=6 -R "index.html*" \
https://dl.rockylinux.org/vault/rocky/8.6/BaseOS/x86_64/os/

mkdir -p /repo/AppStream
cd /repo/AppStream

wget --no-check-certificate -r -np -nH --cut-dirs=6 -R "index.html*" \
https://dl.rockylinux.org/vault/rocky/8.6/AppStream/x86_64/os/
```

### 압축하기

```bash
cd /repo
tar -czvf rocky8.6_repo.tar.gz BaseOS/ AppStream/
```

---

## 📦 2. 내부망으로 전송 및 압축 해제

압축된 `.tar.gz` 파일을 내부망 서버로 전송합니다. (USB, 보안디스크, 망간자료전송시스템 등 활용)

내부망 서버에서 아래 명령으로 압축을 해제합니다:

```bash
cd /mnt/
tar -xzvf rocky8.6_repo.tar.gz
```

---

## 🗂 3. YUM 저장소 설정

아래 경로에 로컬 저장소 설정 파일을 생성합니다:

```bash
vi /etc/yum.repos.d/local-rocky8.repo
```

내용:

```ini
[baseos]
name=Rocky Linux 8.6 - BaseOS Offline
baseurl=file:///mnt/repo/BaseOS/
enabled=1
gpgcheck=0

[appstream]
name=Rocky Linux 8.6 - AppStream Offline
baseurl=file:///mnt/repo/AppStream/
enabled=1
gpgcheck=0
```

> GPG 인증이 필요한 경우 `gpgcheck=1`로 설정 후 GPG 키를 등록해 주세요.

---

## ✅ 4. 저장소 캐시 초기화 및 테스트

```bash
dnf clean all
dnf makecache
dnf repolist
dnf install -y vim
```

`vim` 패키지가 정상적으로 설치된다면 내부망 저장소 구성이 완료된 것입니다.

---

## 📅 마무리 및 제언

이제 내부망 환경에서도 안정적으로 `dnf` 또는 `yum` 을 활용한 패키지 설치가 가능합니다. 필요한 툴이나 유틸리티도 별도 파일 수급 없이 로컬 저장소를 통해 제공할 수 있어 효율적입니다.

---

**감사합니다.**  
> 작성자: **(Mengi's IT Blog)**
