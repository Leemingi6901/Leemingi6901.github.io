---
layout: post
title: "[STUDY_7] Ansible 환경 구성 가이드 (온프레미스 & 클라우드)"
date: 2025-05-02 09:00:00 +0900
categories: ['Infra_Study']
tags: [Ansible, 자동화, 인프라, AWS, 온프레미스]
---

안녕하세요. 멩기입니다.
이번에는 네트워크 및 인프라를 보다 효율적으로 관리할 수 있는 Ansible에 대해서 말씀드리고자 합니다.
저는 현재 Grafana, Zabbix를 통해 네트워크나 인프라를 모니터링을 하고있습니다.

다만 최근 마이그레이션 이슈등으로 인해 신규 서버 발급을 자주 진행하고있는데
그때마다 도커부터 모니터링 에이전트 그리고 기타 필수 프로그램을 하나하나 설치해주는게 귀찮다고 느껴져서
Ansible을 도입하고자 생각중에 있어 알아본 내용을 공유드리려고 작성합니다.

Ansible은 Red Hat에서 관리하는 오픈소스 IT 자동화 도구로, 다음과 같은 작업을 자동화할 수 있습니다:

- 서버 설정
- 애플리케이션 배포
- 구성 관리
- 반복 작업 자동화

에이전트 설치 없이 SSH로 동작하며, YAML 기반의 Playbook으로 작업을 정의합니다.

---

## 1. 기본 구성 요소

- **Control Node**: Ansible이 설치된 서버 (보통은 Linux)
- **Managed Nodes**: 제어할 대상 서버들
- **Inventory**: 대상 서버 목록 (정적/동적)
- **Playbook**: 작업 정의 파일 (YAML 형식)
- **Role**: 재사용 가능한 플레이북 구조

---

## 2. 온프레미스 환경 구성

### ✅ 구성 예시

```
Control Node
   └── SSH (내부망)
       ├── DB 서버
       ├── WAS 서버
       └── WEB 서버
```

### 🔧 주요 활용

- 초기 서버 세팅 자동화
- 보안 패치 배포
- Prometheus / node_exporter 설치
- 서버별 백업 스크립트 배포

### ⚠️ 주의사항

- SSH 방화벽 및 포트 오픈 확인
- sudo 권한 통일
- Python 2.7 이상 설치 확인

---

## 3. 클라우드 환경 구성 (AWS 기준)

### ✅ 구성 예시

```
로컬 노트북
   └── SSH → EC2 인스턴스
   └── AWS API → 동적 인벤토리
```

### 🔧 주요 활용

- EC2 자동 초기화 (AMI + Ansible)
- 태그 기반 대상 선택
- S3 백업 자동화
- CloudWatch Agent 설치

### 🛠️ 동적 인벤토리 구성 예시

```yaml
plugin: amazon.aws.aws_ec2
regions:
  - ap-northeast-2
filters:
  tag:Project: myproject
```

필요 IAM 권한:

- ec2:DescribeInstances
- ec2:DescribeTags

---

## 4. 환경별 비교 요약

| 항목 | 온프레미스 | 클라우드 (AWS) |
|------|------------|----------------|
| 접근 방식 | SSH | SSH + API + IAM |
| 인벤토리 | 정적 (INI/YAML) | 동적 (태그 기반) |
| 초기 설정 | 수동 or PXE | AMI + UserData + Ansible |
| 보안 | 방화벽, VLAN | 보안그룹, VPC |
| 자동화 수준 | 중간 | 매우 높음 |

---

## 5. 운영 시 주의사항

- SSH 인증: 키 기반 권장
- 비밀 정보: ansible-vault 사용
- Dry-run (`--check`) 적극 활용
- 환경 변수 분리 (`group_vars`, `host_vars`)
- Playbook 조건 분기 (`when`)

---

## 6. 추천 구조 예시

```
ansible/
├── inventory.ini
├── playbooks/
│   └── webserver.yml
├── roles/
│   └── common/
└── group_vars/
    └── webservers.yml
```

---

## 💡 마무리 팁

- `ansible.cfg`에 병렬성(`forks`), 로그 경로 등 설정합니다
- `--limit`, `--tags` 옵션 활용으로 작업 범위 조정합니다
- Terraform과 연계하여 인프라 + 구성 완전 자동화 가능합니다 🚀

---

앞으로도 인프라 자동화 관련 꿀팁을 계속해서 공유드릴 예정입니다.  
도움이 되셨다면 GitHub 블로그에 ⭐와 댓글 부탁드립니다. 감사합니다!
