@echo off
echo ========================================
echo 에스엔엠 렌트카 웹사이트 배포 스크립트
echo ========================================

echo.
echo 1. Git 초기화 및 커밋...
git init
git add .
git commit -m "Initial commit for hosting"

echo.
echo 2. 배포 옵션을 선택하세요:
echo.
echo [1] GitHub Pages (무료)
echo [2] Netlify (무료)
echo [3] Vercel (무료)
echo [4] Firebase Hosting (무료)
echo [5] 로컬 테스트
echo.
set /p choice="선택하세요 (1-5): "

if "%choice%"=="1" goto github
if "%choice%"=="2" goto netlify
if "%choice%"=="3" goto vercel
if "%choice%"=="4" goto firebase
if "%choice%"=="5" goto local
goto end

:github
echo.
echo GitHub Pages 배포를 위한 단계:
echo 1. GitHub에 새 저장소를 생성하세요
echo 2. 다음 명령어를 실행하세요:
echo    git remote add origin https://github.com/yourusername/rentcar-website.git
echo    git branch -M main
echo    git push -u origin main
echo 3. GitHub 저장소 Settings > Pages에서 배포 설정
echo.
pause
goto end

:netlify
echo.
echo Netlify 배포:
echo 1. https://netlify.com 에 접속
echo 2. "New site from Git" 클릭
echo 3. GitHub 저장소 연결
echo 4. 자동 배포 완료!
echo.
pause
goto end

:vercel
echo.
echo Vercel 배포:
echo 1. https://vercel.com 에 접속
echo 2. GitHub 저장소 import
echo 3. 자동 배포 완료!
echo.
pause
goto end

:firebase
echo.
echo Firebase Hosting 배포:
echo Firebase CLI가 설치되어 있지 않다면:
echo npm install -g firebase-tools
echo.
echo 그 후 다음 명령어를 실행하세요:
echo firebase login
echo firebase init hosting
echo firebase deploy
echo.
pause
goto end

:local
echo.
echo 로컬 테스트 서버 시작...
echo http://localhost:8000 에서 확인하세요
echo.
python -m http.server 8000
goto end

:end
echo.
echo 배포 준비가 완료되었습니다!
echo README.md 파일을 참고하여 배포를 진행하세요.
pause 