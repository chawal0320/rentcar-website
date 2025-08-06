# 에스엔엠 렌트카 웹사이트

안전하고 편리한 차량 대여 서비스를 제공하는 렌트카 웹사이트입니다.

## 🚀 호스팅 가이드

### 1. GitHub Pages (무료)
```bash
# GitHub에 저장소 생성 후
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/rentcar-website.git
git push -u origin main

# Settings > Pages에서 배포 설정
```

### 2. Netlify (무료)
1. [Netlify](https://netlify.com)에 가입
2. "New site from Git" 선택
3. GitHub 저장소 연결
4. 자동 배포 설정

### 3. Vercel (무료)
1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 import
3. 자동 배포 설정

### 4. Firebase Hosting (무료)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📁 프로젝트 구조

```
rentcar-website-backup/
├── index.html          # 메인 페이지
├── vehicles.html       # 차량 목록 페이지
├── accident-replacement.html  # 사고대차 페이지
├── insurance-info.html # 보험 정보 페이지
├── styles.css          # 스타일시트
├── script.js           # 자바스크립트
├── images/             # 차량 이미지들
└── README.md           # 프로젝트 설명
```

## 🎨 주요 기능

- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **차량 카테고리**: 경제형, 중형/대형, SUV/RV, 럭셔리
- **실시간 문의**: 카카오톡 연동
- **지도 연동**: 구글 맵스 연동
- **애니메이션**: 부드러운 스크롤 및 호버 효과

## 📞 연락처

- **전화**: 0507-1337-3679
- **카카오톡**: [문의하기](http://pf.kakao.com/_ctKfn/chat)
- **주소**: 경기도 평택시 용이동 129

## 🛠️ 기술 스택

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- JavaScript (ES6+)
- Font Awesome Icons
- Google Fonts

## 📱 반응형 지원

- 모바일 (320px ~ 768px)
- 태블릿 (768px ~ 1024px)
- 데스크톱 (1024px+)

## 🚀 배포 후 확인사항

1. 모든 이미지가 정상 로드되는지 확인
2. 카카오톡 링크가 정상 작동하는지 확인
3. 구글 맵스가 정상 표시되는지 확인
4. 모바일에서 반응형이 정상 작동하는지 확인

## 📄 라이선스

© 2024 에스엔엠 렌트카. All rights reserved.
