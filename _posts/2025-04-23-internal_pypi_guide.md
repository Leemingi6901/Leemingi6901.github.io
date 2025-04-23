---
layout: post
title: "[STUDY_6] PyPI & Linux Insatll 명령어 기본 개념 정리"
date: 2025-04-23 09:00:00 +0900
categories: ['Infra_Study']
tags: ['Docker', '인프라', 'Linux']
---

안녕하세요. 멩기 입니다.

사내망(Air-Gapped Network) 또는 외부망이 차단된 보안 환경에서는 일반적으로 사용하는 `pip install` 명령어가 작동하지 않습니다. 이는 기본적으로 파이썬의 공식 패키지 저장소인 [PyPI](https://pypi.org)와의 통신이 필요하기 때문입니다.

본 게시글에서는 PyPI의 개념, `dnf install`과의 차이점, 그리고 내부망 환경에서 `pip install`을 가능하게 하기 위한 사설 PyPI 저장소 운영 방법과 그 필요성에 대해 정리하였습니다.

---

## PyPI란?

**PyPI (Python Package Index)**는 파이썬에서 사용할 수 있는 공식 패키지 저장소로, 전 세계 개발자들이 만든 오픈소스 라이브러리를 업로드하고, 또 다른 사람들이 이를 쉽게 설치하고 사용할 수 있도록 돕는 플랫폼입니다.

### 주요 특징

- 파이썬 생태계의 중심 패키지 저장소
- `pip install` 명령어를 통해 설치 가능
- 자신이 만든 패키지도 배포 가능
- `https://pypi.org`에서 검색 및 정보 확인 가능

---

## `pip install`과 `dnf install`의 차이

| 항목 | `pip install` | `dnf install` |
|------|----------------|----------------|
| 설치 대상 | Python 패키지 (라이브러리) | OS 패키지 (시스템 도구 등) |
| 사용 환경 | Python 환경 (가상환경 포함) | Linux 시스템 전반 |
| 패키지 출처 | PyPI | DNF 저장소 (Fedora, RHEL 등) |
| 관리 도구 | pip | dnf |
| 설치 위치 | Python 전용 디렉토리 | 시스템 디렉토리 (/usr 등) |

`pip install`은 파이썬에서 사용하는 라이브러리를 설치할 때, `dnf install`은 OS 자체 기능이나 시스템 패키지를 설치할 때 사용됩니다.

---

## 내부망에서 사설 PyPI 저장소가 필요한 이유

| 이유 | 설명 |
|------|------|
| 보안 | 외부 접근 차단 환경에서도 안전하게 패키지 관리 |
| 버전 통제 | 검증된 버전만 사용하여 안정성 확보 |
| 캐시 효과 | 설치 속도 향상 |
| 완전 차단 환경 지원 | 인터넷 없이도 파이썬 패키지 설치 가능 |

---

## 내부망에서 pip install을 사용하는 방법

### 1. 사설 PyPI 서버 구축

사내망에 자체 PyPI 저장소를 구축합니다. 사용 가능한 도구:

- Devpi
- Artifactory
- Sonatype Nexus
- Nginx 기반 파일 서버

### 2. pip 명령어에서 저장소 지정

```bash
pip install --index-url http://<internal-pypi-server>/simple 패키지명
```

외부 접근 차단 시:

```bash
pip install --no-index --find-links=http://<internal-server>/packages/ 패키지명
```

### 3. pip 설정 파일 등록

```ini
# Linux/macOS: ~/.pip/pip.conf
# Windows: %APPDATA%\pip\pip.ini
[global]
index-url = http://<internal-pypi-server>/simple
trusted-host = <internal-pypi-server>
```

---

## 사내 패키지 업로드

사내에서 만든 패키지를 업로드하려면:

```bash
twine upload --repository-url http://<internal-pypi-server> dist/*
```

---

## 마무리

내부망에서 파이썬 환경을 안정적으로 유지하려면 사설 PyPI 저장소는 필수입니다.  
보안성, 버전 통제, 설치 속도 향상 등 다양한 이점을 제공합니다.
