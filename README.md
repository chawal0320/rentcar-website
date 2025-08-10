# 렌트카 웹사이트 프로젝트

## 📋 프로젝트 개요
렌트카 예약 및 관리 시스템을 위한 웹사이트입니다. 관리자 대시보드를 통해 차량 관리, 사용자 관리, 접근 로그 관리, IP 차단 관리 등의 기능을 제공합니다.

## 🚀 주요 기능

### 🏠 메인 웹사이트
- 차량 검색 및 예약
- 회사 소개 및 서비스 안내
- 보험 정보 및 정책 안내
- 연락처 및 위치 정보

### 🔐 관리자 대시보드
- **접근 로그 관리**: 실시간 접근 기록 모니터링
- **차단 관리**: IP 차단/해제, 차단 기록 관리
- **테스트 데이터 관리**: 샘플 데이터 생성 및 관리
- **사용자 관리**: 계정별 접근 권한 관리

## 🛠️ 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **배포**: Vercel
- **CI/CD**: GitHub Actions
- **데이터 저장**: LocalStorage (클라이언트 사이드)

## 📁 프로젝트 구조
```
rentcar-website-backup/
├── index.html                 # 메인 웹사이트
├── admin-dashboard.html      # 관리자 대시보드
├── styles.css                # 공통 스타일시트
├── .github/
│   └── workflows/
│       └── vercel-deploy.yml # Vercel 배포 워크플로우
└── README.md                 # 프로젝트 문서
```

## 🚀 배포 방법

### 1. GitHub 저장소 설정
1. GitHub에 새 저장소 생성
2. 로컬 프로젝트를 GitHub에 푸시:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repository-name.git
git push -u origin main
```

### 2. Vercel 연동
1. [Vercel](https://vercel.com)에 로그인
2. 새 프로젝트 생성 및 GitHub 저장소 연결
3. 환경 변수 설정:
   - `VERCEL_TOKEN`: Vercel API 토큰
   - `VERCEL_ORG_ID`: Vercel 조직 ID
   - `VERCEL_PROJECT_ID`: Vercel 프로젝트 ID

### 3. GitHub Secrets 설정
GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 설정:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 🔄 자동 배포
- `main` 브랜치에 푸시할 때마다 자동으로 Vercel에 배포됩니다
- Pull Request 생성 시에도 배포가 트리거됩니다

## 📱 반응형 디자인
- 모바일, 태블릿, 데스크톱 모든 디바이스 지원
- 터치 친화적인 인터페이스
- 접근성 고려한 UI/UX

## 🔒 보안 기능
- IP 기반 접근 제어
- 관리자 권한 관리
- 접근 로그 모니터링
- 차단 IP 관리

## 📊 관리자 기능

### 접근 로그 관리
- 실시간 접근 기록 표시
- IP 주소별 접근 패턴 분석
- 중복 접근 감지 및 알림
- 데이터 필터링 및 검색

### 차단 관리
- IP 주소 차단/해제
- 차단 사유 및 기간 설정
- 자동 해제 기록 관리
- 차단 데이터 CSV 다운로드

### 테스트 데이터
- 샘플 데이터 생성
- 데이터 관리 및 정리
- 테스트 시나리오 지원

## 🤝 기여 방법
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의
프로젝트에 대한 문의사항이 있으시면 GitHub Issues를 통해 연락해주세요.

---

**마지막 업데이트**: 2024년 12월
