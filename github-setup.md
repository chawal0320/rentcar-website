# GitHub 저장소 생성 및 배포 가이드

## 1. GitHub 저장소 생성

### 1-1. GitHub에 로그인
- https://github.com 에 접속
- GitHub 계정으로 로그인

### 1-2. 새 저장소 생성
1. GitHub 메인 페이지에서 **"New"** 버튼 클릭
2. **Repository name**: `rentcar-website` 입력
3. **Description**: `에스엔엠 렌트카 웹사이트` 입력
4. **Public** 선택 (GitHub Pages 사용을 위해)
5. **"Add a README file"** 체크 해제 (이미 있음)
6. **"Create repository"** 클릭

## 2. 로컬 저장소를 GitHub에 연결

### 2-1. 원격 저장소 추가
```bash
git remote add origin https://github.com/YOUR_USERNAME/rentcar-website.git
```

### 2-2. 메인 브랜치 설정 및 푸시
```bash
git branch -M main
git push -u origin main
```

## 3. GitHub Pages 설정

### 3-1. 저장소 설정으로 이동
1. GitHub 저장소 페이지에서 **"Settings"** 탭 클릭
2. 왼쪽 메뉴에서 **"Pages"** 클릭

### 3-2. GitHub Pages 활성화
1. **Source** 섹션에서 **"Deploy from a branch"** 선택
2. **Branch** 드롭다운에서 **"main"** 선택
3. **Folder** 드롭다운에서 **"/(root)"** 선택
4. **"Save"** 클릭

### 3-3. 배포 확인
- 몇 분 후 **"Your site is published at"** 메시지 확인
- 제공된 URL로 웹사이트 접속 가능

## 4. 커스텀 도메인 설정 (선택사항)

### 4-1. 도메인 추가
1. **Custom domain** 섹션에서 도메인 입력
2. **"Save"** 클릭
3. DNS 설정에서 CNAME 레코드 추가

## 5. 자동 배포 설정

### 5-1. 워크플로우 파일 생성
`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## 6. 문제 해결

### 6-1. 404 에러
- 저장소가 Public인지 확인
- GitHub Pages가 활성화되었는지 확인

### 6-2. 이미지가 로드되지 않음
- 이미지 경로가 올바른지 확인
- 파일명에 한글이 포함된 경우 URL 인코딩 확인

### 6-3. CSS/JS가 로드되지 않음
- 파일 경로가 올바른지 확인
- 브라우저 개발자 도구에서 오류 확인

## 7. 성능 최적화

### 7-1. 이미지 최적화
- 이미지 크기 최적화
- WebP 형식 사용 고려

### 7-2. 캐싱 설정
- 브라우저 캐싱 활용
- CDN 사용 고려

## 8. 모니터링

### 8-1. Analytics 설정
- Google Analytics 추가
- GitHub Pages 방문자 통계 확인

### 8-2. 성능 모니터링
- Google PageSpeed Insights 사용
- Core Web Vitals 확인

## 9. 보안 설정

### 9-1. HTTPS 강제
- GitHub Pages는 기본적으로 HTTPS 제공
- 혼합 콘텐츠 오류 확인

### 9-2. CSP 헤더 설정
- Content Security Policy 설정 고려

## 10. 백업 및 복구

### 10-1. 정기 백업
- 로컬 저장소 백업
- GitHub 저장소 클론

### 10-2. 롤백 방법
- 이전 커밋으로 되돌리기
- GitHub Pages 설정 복원

---

**참고**: GitHub Pages는 무료로 제공되며, 월 100GB 대역폭과 월 10만 건의 빌드 시간을 제공합니다. 