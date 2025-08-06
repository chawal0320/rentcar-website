#!/bin/bash

echo "========================================"
echo "에스엔엠 렌트카 웹사이트 배포 스크립트"
echo "========================================"

echo ""
echo "1. Git 초기화 및 커밋..."
git init
git add .
git commit -m "Initial commit for hosting"

echo ""
echo "2. 배포 옵션을 선택하세요:"
echo ""
echo "[1] GitHub Pages (무료)"
echo "[2] Netlify (무료)"
echo "[3] Vercel (무료)"
echo "[4] Firebase Hosting (무료)"
echo "[5] 로컬 테스트"
echo ""
read -p "선택하세요 (1-5): " choice

case $choice in
    1)
        echo ""
        echo "GitHub Pages 배포를 위한 단계:"
        echo "1. GitHub에 새 저장소를 생성하세요"
        echo "2. 다음 명령어를 실행하세요:"
        echo "   git remote add origin https://github.com/yourusername/rentcar-website.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
        echo "3. GitHub 저장소 Settings > Pages에서 배포 설정"
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
        ;;
    2)
        echo ""
        echo "Netlify 배포:"
        echo "1. https://netlify.com 에 접속"
        echo "2. 'New site from Git' 클릭"
        echo "3. GitHub 저장소 연결"
        echo "4. 자동 배포 완료!"
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
        ;;
    3)
        echo ""
        echo "Vercel 배포:"
        echo "1. https://vercel.com 에 접속"
        echo "2. GitHub 저장소 import"
        echo "3. 자동 배포 완료!"
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
        ;;
    4)
        echo ""
        echo "Firebase Hosting 배포:"
        echo "Firebase CLI가 설치되어 있지 않다면:"
        echo "npm install -g firebase-tools"
        echo ""
        echo "그 후 다음 명령어를 실행하세요:"
        echo "firebase login"
        echo "firebase init hosting"
        echo "firebase deploy"
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
        ;;
    5)
        echo ""
        echo "로컬 테스트 서버 시작..."
        echo "http://localhost:8000 에서 확인하세요"
        echo ""
        python3 -m http.server 8000
        ;;
    *)
        echo "잘못된 선택입니다."
        ;;
esac

echo ""
echo "배포 준비가 완료되었습니다!"
echo "README.md 파일을 참고하여 배포를 진행하세요." 