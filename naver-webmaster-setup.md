# 네이버 웹마스터 도구 설정 가이드

## 📋 등록 단계

### 1. 사이트 등록
- URL: https://에스엔엠렌트카.kr
- 사이트명: 에스엔엠 렌트카
- 카테고리: 비즈니스 > 렌트카/차량대여

### 2. 인증 방법
#### HTML 파일 인증 (권장)
1. 네이버에서 제공하는 인증 파일 다운로드
2. 웹사이트 루트에 업로드
3. 인증 확인

#### 메타 태그 인증
현재 HTML 파일에 인증 태그가 준비되어 있습니다.
실제 발급받은 인증 코드로 교체하세요:

```html
<!-- index.html, vehicles.html, accident-replacement.html, insurance-info.html -->
<meta name="naver-site-verification" content="실제_인증코드">
```

### 3. 사이트맵 제출
- URL: https://에스엔엠렌트카.kr/sitemap.xml
- 제출 후 검증 확인

### 4. 검색 최적화 설정

#### 키워드 설정
- 주요 키워드: 평택렌트카, 에스엔엠렌트카, 사고대차
- 지역 키워드: 평택, 경기도
- 서비스 키워드: 차량대여, 렌트카, 보험안내

#### 모니터링 항목
- 검색 노출 수
- 클릭 수
- 클릭률 (CTR)
- 평균 순위

### 5. 추가 최적화

#### 네이버 애널리틱스 연동 (선택사항)
```html
<script type="text/javascript" src="//wcs.naver.net/wcslog.js"></script>
<script type="text/javascript">
if(!wcs_add) var wcs_add = {};
wcs_add["wa"] = "실제_애널리틱스_코드";
wcs_do();
</script>
```

#### 네이버 블로그/카페 연동
- 네이버 블로그에 사이트 소개글 작성
- 관련 카페에 홍보글 게시
- 네이버 지식인 Q&A 활용

### 6. 정기 관리
- 월 1회 사이트맵 업데이트
- 검색 성과 리포트 확인
- 키워드 순위 모니터링
- 사용자 피드백 반영

## 🎯 예상 효과
- 네이버 검색 노출 증가
- 지역 검색 최적화
- 사용자 신뢰도 향상
- 문의 전환율 증가 