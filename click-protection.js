/**
 * 네이버 광고 부정클릭 방지 시스템
 * 에스엔엠렌트카 홈페이지용
 */

class ClickProtectionSystem {
    constructor() {
        this.clickData = [];
        this.suspiciousPatterns = [];
        this.blockedIPs = new Set();
        this.sessionData = this.getSessionData();
        
        // 관리자 모드 확인 (admin-dashboard.html인지 체크)
        this.isAdminMode = window.location.pathname.includes('admin-dashboard.html') || 
                           window.location.href.includes('admin-dashboard.html');
        
        // 네이버 광고 API 설정
        this.naverApiConfig = {
            accessLicense: '01000000009f1a8537c8e834d658c880d7ce576ba1f37ef528238e367fc86c0d26abedd311',
            secretKey: 'AQAAAACfGoU3yOg01ljIgNfOV2uhWq+uuhbXfy/tsz4BwDjyTg==',
            baseUrl: 'https://api.naver.com',
            customerId: null // 고객 ID는 API 호출 시 설정
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startMonitoring();
        this.loadBlockedIPs();
    }

    // 세션 데이터 초기화
    getSessionData() {
        const sessionId = this.generateSessionId();
        const timestamp = Date.now();
        const userAgent = navigator.userAgent;
        const referrer = document.referrer;
        
        return {
            sessionId,
            timestamp,
            userAgent,
            referrer,
            clickCount: 0,
            lastClickTime: 0,
            pageViews: 0,
            timeOnPage: 0
        };
    }

    // 세션 ID 생성
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 모든 클릭 이벤트 감지
        document.addEventListener('click', (e) => {
            this.handleClick(e);
        });

        // 페이지뷰 추적
        this.trackPageView();
        
        // 페이지 떠남 감지
        window.addEventListener('beforeunload', () => {
            this.trackPageExit();
        });

        // 키보드 이벤트 (봇 감지)
        document.addEventListener('keydown', (e) => {
            this.trackKeyboardActivity(e);
        });

        // 마우스 움직임 (봇 감지)
        document.addEventListener('mousemove', (e) => {
            this.trackMouseMovement(e);
        });
    }

    // 클릭 이벤트 처리
    handleClick(event) {
        const clickData = {
            timestamp: Date.now(),
            x: event.clientX,
            y: event.clientY,
            target: event.target.tagName,
            targetText: event.target.textContent?.substring(0, 50) || '',
            sessionId: this.sessionData.sessionId,
            ipAddress: this.getCurrentIP(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        // 클릭 데이터 저장
        this.clickData.push(clickData);
        this.sessionData.clickCount++;
        this.sessionData.lastClickTime = clickData.timestamp;

        // 부정클릭 패턴 분석
        this.analyzeClickPattern(clickData);

        // 네이버 광고 클릭인지 확인 후 경고 팝업 표시 (비동기 처리)
        this.isNaverAdClick(event).then(isAdClick => {
            if (isAdClick) {
                this.showWarningPopup();
            }
        }).catch(error => {
            console.log('❌ 네이버 광고 클릭 확인 중 오류:', error.message);
        });

        // 클릭 데이터 전송 (서버로)
        this.sendClickData(clickData);

        // 로컬 스토리지에 저장
        this.saveClickData();
    }

    // 클릭 패턴 분석
    analyzeClickPattern(clickData) {
        const now = Date.now();
        const recentClicks = this.clickData.filter(click => 
            now - click.timestamp < 60000 // 1분 내
        );

        // 1. 과도한 클릭 감지
        if (recentClicks.length > 10) {
            this.flagSuspiciousActivity('EXCESSIVE_CLICKS', {
                count: recentClicks.length,
                timeWindow: '1분',
                sessionId: this.sessionData.sessionId
            });
        }

        // 2. 동일 위치 반복 클릭 감지
        const sameLocationClicks = recentClicks.filter(click => 
            Math.abs(click.x - clickData.x) < 5 && 
            Math.abs(click.y - clickData.y) < 5
        );
        
        if (sameLocationClicks.length > 3) {
            this.flagSuspiciousActivity('REPEATED_LOCATION_CLICKS', {
                location: { x: clickData.x, y: clickData.y },
                count: sameLocationClicks.length,
                sessionId: this.sessionData.sessionId
            });
        }

        // 3. 비정상적인 클릭 간격 감지
        if (this.sessionData.lastClickTime > 0) {
            const timeDiff = clickData.timestamp - this.sessionData.lastClickTime;
            if (timeDiff < 100) { // 100ms 미만 간격
                this.flagSuspiciousActivity('UNNATURAL_CLICK_INTERVAL', {
                    interval: timeDiff,
                    sessionId: this.sessionData.sessionId
                });
            }
        }

        // 4. 봇 패턴 감지
        this.detectBotPatterns(clickData);
    }

    // 봇 패턴 감지
    detectBotPatterns(clickData) {
        // 마우스 움직임이 없는 클릭
        if (!this.hasMouseMovement) {
            this.flagSuspiciousActivity('NO_MOUSE_MOVEMENT', {
                sessionId: this.sessionData.sessionId,
                timestamp: clickData.timestamp
            });
        }

        // 키보드 활동이 없는 세션
        if (!this.hasKeyboardActivity) {
            this.flagSuspiciousActivity('NO_KEYBOARD_ACTIVITY', {
                sessionId: this.sessionData.sessionId,
                timestamp: clickData.timestamp
            });
        }
    }

    // 의심스러운 활동 플래그
    flagSuspiciousActivity(type, data) {
        const suspiciousActivity = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionData.sessionId,
            ipAddress: this.getCurrentIP(),
            url: window.location.href
        };

        // 로컬 스토리지에 저장
        const existingActivities = JSON.parse(localStorage.getItem('suspiciousActivities') || '[]');
        existingActivities.push(suspiciousActivity);
        localStorage.setItem('suspiciousActivities', JSON.stringify(existingActivities));

        // IP별 일일 접속 횟수 확인 및 자동 차단
        this.checkAndBlockIP(suspiciousActivity.ipAddress);

        console.log('🚨 의심스러운 활동 감지:', suspiciousActivity);
    }

    // IP별 일일 접속 횟수 확인 및 자동 차단
    checkAndBlockIP(ipAddress) {
        if (!ipAddress || ipAddress === '알 수 없음') return;

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
        const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
        
        // 오늘 해당 IP의 클릭 횟수 계산
        const todayClicks = clickData.filter(click => {
            const clickDate = new Date(click.timestamp).toISOString().split('T')[0];
            return click.ipAddress === ipAddress && clickDate === today;
        });

        // 10회 이상이면 자동 차단
        if (todayClicks.length >= 10) {
            this.blockIP(ipAddress, todayClicks.length, today);
        }
    }

    // IP 차단
    blockIP(ipAddress, clickCount, date) {
        // 이미 차단된 IP인지 확인
        const blockedIPs = JSON.parse(localStorage.getItem('blockedIPs') || '[]');
        const isAlreadyBlocked = blockedIPs.some(blocked => blocked.ipAddress === ipAddress);
        
        if (isAlreadyBlocked) return; // 이미 차단된 IP는 무시

        const blockedIP = {
            ipAddress: ipAddress,
            blockedAt: new Date().toISOString(),
            blockedDate: date,
            clickCount: clickCount,
            reason: '일일 접속 횟수 초과 (10회 이상)',
            sessionId: this.sessionData.sessionId,
            url: window.location.href
        };

        // 차단된 IP 목록에 추가
        blockedIPs.push(blockedIP);
        localStorage.setItem('blockedIPs', JSON.stringify(blockedIPs));

        // 차단 이벤트 로그에 기록
        const blockLog = {
            type: 'IP_AUTO_BLOCKED',
            data: blockedIP,
            timestamp: new Date().toISOString()
        };

        const existingActivities = JSON.parse(localStorage.getItem('suspiciousActivities') || '[]');
        existingActivities.push(blockLog);
        localStorage.setItem('suspiciousActivities', JSON.stringify(existingActivities));

        console.log(`🚫 IP ${ipAddress} 자동 차단됨 (${date} 기준 ${clickCount}회 접속)`);
        
        // 차단된 IP에 대한 경고 팝업 표시
        this.showBlockedIPWarning(ipAddress, clickCount, date);
    }

    // 차단된 IP 경고 팝업 표시
    showBlockedIPWarning(ipAddress, clickCount, date) {
        const popup = document.createElement('div');
        popup.className = 'blocked-ip-warning';
        popup.innerHTML = `
            <div class="warning-header blocked">
                <h3>🚫 IP 자동 차단됨</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="warning-content">
                <p><strong>차단된 IP:</strong> ${ipAddress}</p>
                <p><strong>차단 사유:</strong> ${date} 기준 ${clickCount}회 접속 (한도: 10회)</p>
                <p><strong>차단 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                <div class="warning-actions">
                    <button class="btn btn-danger" onclick="clickProtection.unblockIP('${ipAddress}')">차단 해제</button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">닫기</button>
                </div>
            </div>
        `;

        // 기존 차단 경고 팝업 제거
        this.removeExistingBlockedIPWarnings();
        
        // 페이지에 추가
        document.body.appendChild(popup);
        
        // 10초 후 자동 제거 (관리자가 닫지 않은 경우)
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 10000);
    }

    // 기존 차단 IP 경고 팝업 제거
    removeExistingBlockedIPWarnings() {
        const existingWarnings = document.querySelectorAll('.blocked-ip-warning');
        existingWarnings.forEach(warning => warning.remove());
    }

    // IP 차단 해제
    unblockIP(ipAddress) {
        const blockedIPs = JSON.parse(localStorage.getItem('blockedIPs') || '[]');
        const updatedBlockedIPs = blockedIPs.filter(blocked => blocked.ipAddress !== ipAddress);
        localStorage.setItem('blockedIPs', JSON.stringify(updatedBlockedIPs));

        // 차단 해제 이벤트 로그에 기록
        const unblockLog = {
            type: 'IP_UNBLOCKED',
            data: { ipAddress, unblockedAt: new Date().toISOString() },
            timestamp: new Date().toISOString()
        };

        const existingActivities = JSON.parse(localStorage.getItem('suspiciousActivities') || '[]');
        existingActivities.push(unblockLog);
        localStorage.setItem('suspiciousActivities', JSON.stringify(existingActivities));

        console.log(`✅ IP ${ipAddress} 차단 해제됨`);
        
        // 차단 해제 성공 메시지
        alert(`IP ${ipAddress}의 차단이 해제되었습니다.`);
        
        // 관리자 대시보드가 열려있다면 테이블 새로고침
        if (window.location.pathname.includes('admin-dashboard.html')) {
            if (typeof filterSuspiciousActivities === 'function') {
                filterSuspiciousActivities();
            }
        }
    }

    // 페이지뷰 추적
    trackPageView() {
        this.sessionData.pageViews++;
        this.pageLoadTime = Date.now();
        
        // 페이지뷰 데이터 전송
        this.sendPageViewData();
    }

    // 페이지 떠남 추적
    trackPageExit() {
        if (this.pageLoadTime) {
            this.sessionData.timeOnPage = Date.now() - this.pageLoadTime;
        }
        
        // 세션 데이터 전송
        this.sendSessionData();
    }

    // 키보드 활동 추적
    trackKeyboardActivity(event) {
        this.hasKeyboardActivity = true;
        this.lastKeyboardActivity = Date.now();
    }

    // 마우스 움직임 추적
    trackMouseMovement(event) {
        this.hasMouseMovement = true;
        this.lastMouseMovement = Date.now();
    }

    // 클릭 데이터 서버 전송
    sendClickData(clickData) {
        // 실제 구현시 서버 엔드포인트로 전송
        // fetch('/api/click-tracking', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(clickData)
        // });
        
        // 현재는 콘솔에 출력
        console.log('📊 클릭 데이터:', clickData);
    }

    // 의심스러운 활동 리포트
    reportSuspiciousActivity(activity) {
        // 실제 구현시 서버로 전송
        // fetch('/api/suspicious-activity', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(activity)
        // });
        
        console.log('🚨 의심스러운 활동 리포트:', activity);
    }

    // 페이지뷰 데이터 전송
    sendPageViewData() {
        const pageViewData = {
            url: window.location.href,
            timestamp: Date.now(),
            sessionId: this.sessionData.sessionId,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        };
        
        // 실제 구현시 서버로 전송
        console.log('📄 페이지뷰 데이터:', pageViewData);
    }

    // 세션 데이터 전송
    sendSessionData() {
        // 실제 구현시 서버로 전송
        console.log('💾 세션 데이터:', this.sessionData);
    }

    // 모니터링 시작
    startMonitoring() {
        // 주기적으로 데이터 정리 및 분석
        setInterval(() => {
            this.cleanupOldData();
            this.generateReport();
        }, 300000); // 5분마다
    }

    // 오래된 데이터 정리
    cleanupOldData() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.clickData = this.clickData.filter(click => click.timestamp > oneHourAgo);
        this.suspiciousPatterns = this.suspiciousPatterns.filter(pattern => pattern.timestamp > oneHourAgo);
    }

    // 리포트 생성
    generateReport() {
        const report = {
            timestamp: Date.now(),
            sessionId: this.sessionData.sessionId,
            totalClicks: this.clickData.length,
            suspiciousActivities: this.suspiciousPatterns.length,
            sessionDuration: Date.now() - this.sessionData.timestamp,
            pageViews: this.sessionData.pageViews
        };
        
        console.log('📈 활동 리포트:', report);
        return report;
    }

    // 차단된 IP 로드
    loadBlockedIPs() {
        const blocked = localStorage.getItem('blockedIPs');
        if (blocked) {
            this.blockedIPs = new Set(JSON.parse(blocked));
        }
    }

    // 클릭 데이터 로컬 저장
    saveClickData() {
        try {
            localStorage.setItem('clickData', JSON.stringify(this.clickData.slice(-100))); // 최근 100개만
        } catch (e) {
            console.warn('클릭 데이터 저장 실패:', e);
        }
    }

    // 의심스러운 활동 로컬 저장
    saveSuspiciousActivity(activity) {
        try {
            const existing = JSON.parse(localStorage.getItem('suspiciousActivities') || '[]');
            existing.push(activity);
            localStorage.setItem('suspiciousActivities', JSON.stringify(existing.slice(-50))); // 최근 50개만
        } catch (e) {
            console.warn('의심스러운 활동 저장 실패:', e);
        }
    }

    // 통계 데이터 가져오기
    getStatistics() {
        return {
            totalClicks: this.clickData.length,
            suspiciousActivities: this.suspiciousPatterns.length,
            sessionData: this.sessionData,
            recentClicks: this.clickData.slice(-10),
            recentSuspicious: this.suspiciousPatterns.slice(-5)
        };
    }

    // 특정 세션 차단
    blockSession(sessionId) {
        this.blockedIPs.add(sessionId);
        try {
            localStorage.setItem('blockedIPs', JSON.stringify([...this.blockedIPs]));
        } catch (e) {
            console.warn('차단 세션 저장 실패:', e);
        }
    }

    // 세션 차단 해제
    unblockSession(sessionId) {
        if (this.blockedIPs.has(sessionId)) {
            this.blockedIPs.delete(sessionId);
            this.saveBlockedIPs();
            console.log('세션이 차단 해제되었습니다:', sessionId);
        }
    }

    // 단계별 경고 팝업 표시
    showWarningPopup() {
        // 관리자 모드에서는 경고 팝업 표시하지 않음
        if (this.isAdminMode) {
            return;
        }
        
        const clickCount = this.sessionData.clickCount;
        const warningLevel = this.getWarningLevel(clickCount);
        
        if (warningLevel > 0) {
            this.createWarningPopup(warningLevel, clickCount);
        }
    }

    // 경고 단계 결정 (클릭 횟수에 따라)
    getWarningLevel(clickCount) {
        if (clickCount >= 4) return 3;      // 3단계: 4회 이상
        if (clickCount >= 3) return 2;      // 2단계: 3회 이상
        if (clickCount >= 2) return 1;      // 1단계: 2회 이상
        return 0;                           // 경고 없음
    }

            // 경고 팝업 생성
                createWarningPopup(level, clickCount) {
            this.removeExistingPopup();
            
            // 스타일 적용
            this.applyWarningStyles();
            
            const popup = document.createElement('div');
            popup.id = 'warning-popup';
            popup.className = `warning-popup warning-level-${level}`;
            
            const config = this.getWarningConfig(level, clickCount);
            
            // 접속 정보 테이블 생성
            const accessTable = this.createAccessInfoTable(clickCount);
            
            popup.innerHTML = `
                <div class="warning-header">
                    <span class="warning-icon">${config.icon}</span>
                    <span class="warning-title">${config.title}</span>
                    <button class="close-btn" onclick="clickProtection.closeWarningPopup()">×</button>
                </div>
                <div class="warning-content">
                    <p>${config.message}</p>
                    <div class="warning-actions">
                        <button class="favorites-btn" onclick="clickProtection.addToFavorites()">
                            ⭐ 즐겨찾기 추가
                        </button>
                    </div>
                    <div class="access-info-section">
                        <h4>접속 정보</h4>
                        ${accessTable}
                    </div>
                </div>
            `;
            
            document.body.appendChild(popup);
            
            // 사용자가 직접 닫기 버튼을 클릭할 때까지 팝업 유지
            // setTimeout(() => {
            //     this.closeWarningPopup();
            // }, 5000);
        }

    // 접속 정보 테이블 생성
    createAccessInfoTable(clickCount) {
        const currentIP = this.getCurrentIP();
        const currentTime = new Date().toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // 클릭한 수만큼 행 생성
        let tableRows = '';
        for (let i = 0; i < clickCount; i++) {
            tableRows += `
                <tr>
                    <td>${currentIP}</td>
                    <td>가나다 (네이버)</td>
                    <td>${currentTime}</td>
                </tr>
            `;
        }
        
        return `
            <div class="access-table-container">
                <table class="access-table">
                    <thead>
                        <tr>
                            <th>접속IP</th>
                            <th>클릭키워드 (광고매체)</th>
                            <th>접속시간</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 네이버 파워링크 광고 클릭인지 확인 (API 연동 포함)
    async isNaverAdClick(event) {
        // 1. UTM 파라미터 확인 (가장 정확한 방법)
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source');
        const utmMedium = urlParams.get('utm_medium');
        const utmCampaign = urlParams.get('utm_campaign');
        const utmTerm = urlParams.get('utm_term');
        
        // 네이버 파워링크 광고를 통해서만 경고 팝업 표시
        if (utmSource === 'naver' && utmMedium === 'powerlink') {
            console.log('🔄 UTM 파라미터로 네이버 파워링크 광고 클릭 감지됨:', {
                utmSource,
                utmMedium,
                utmCampaign,
                utmTerm
            });
            return true;
        }
        
        // 2. 네이버 파워링크 전용 URL 패턴 확인
        const currentUrl = window.location.href;
        if (this.isNaverPowerLinkUrl(currentUrl)) {
            console.log('🔄 네이버 파워링크 URL 패턴으로 광고 클릭 감지됨:', currentUrl);
            return true;
        }
        
        // 3. 리퍼러가 네이버 검색/광고인 경우 확인
        if (this.isNaverReferrer(document.referrer)) {
            console.log('🔄 네이버 리퍼러로부터 광고 클릭 감지됨:', document.referrer);
            return true;
        }
        
        // 4. 클릭된 요소의 파워링크 광고 특성 확인
        if (this.hasPowerLinkCharacteristics(event)) {
            console.log('🔄 파워링크 광고 요소 특성으로 감지됨');
            return true;
        }
        
        // 5. API 연동으로 추가 검증 (백그라운드에서 실행)
        try {
            const clickData = {
                timestamp: Date.now(),
                referrer: document.referrer,
                url: window.location.href,
                target: event.target.tagName,
                targetText: event.target.textContent?.substring(0, 50) || ''
            };
            
            // 비동기로 API 검증 실행 (결과는 로그로만 확인)
            this.verifyNaverAdClick(clickData).then(isAdClick => {
                if (isAdClick) {
                    console.log('🔗 API 검증으로 네이버 광고 클릭 확인됨');
                }
            }).catch(error => {
                console.log('🔗 API 검증 중 오류:', error.message);
            });
        } catch (error) {
            console.log('🔗 API 검증 준비 중 오류:', error.message);
        }
        
        // 일반 클릭은 광고가 아님
        console.log('📝 일반 클릭 (광고 아님):', {
            target: event.target.tagName,
            text: event.target.textContent?.substring(0, 30) || '',
            referrer: document.referrer,
            url: window.location.href
        });
        
        return false;
    }
    
    // 네이버 파워링크 URL 패턴 확인
    isNaverPowerLinkUrl(url) {
        const powerLinkPatterns = [
            /powerlink\.naver\.com/,
            /ad\.naver\.com\/powerlink/,
            /ads\.naver\.com\/powerlink/,
            /search\.naver\.com\/search\.naver\?.*query=.*&where=powerlink/,
            /cafe\.naver\.com\/.*\?query=.*&where=powerlink/,
            /blog\.naver\.com\/.*\?query=.*&where=powerlink/,
            /news\.naver\.com\/.*\?query=.*&where=powerlink/
        ];
        
        return powerLinkPatterns.some(pattern => pattern.test(url));
    }
    
    // 네이버 파워링크 리퍼러 확인
    isNaverReferrer(referrer) {
        if (!referrer) return false;
        
        // 파워링크 관련 도메인과 경로만 확인
        const powerLinkPatterns = [
            /powerlink\.naver\.com/,
            /ad\.naver\.com\/powerlink/,
            /ads\.naver\.com\/powerlink/,
            /search\.naver\.com\/search\.naver\?.*where=powerlink/,
            /cafe\.naver\.com\/.*\?.*where=powerlink/,
            /blog\.naver\.com\/.*\?.*where=powerlink/,
            /news\.naver\.com\/.*\?.*where=powerlink/
        ];
        
        return powerLinkPatterns.some(pattern => pattern.test(referrer));
    }
    
    // 파워링크 광고 요소 특성 확인
    hasPowerLinkCharacteristics(event) {
        let element = event.target;
        
        while (element && element !== document.body) {
            const className = element.className || '';
            const id = element.id || '';
            const href = element.href || '';
            const textContent = element.textContent || '';
            
            // 파워링크 광고만 감지하도록 더 정확한 패턴 확인
            if (
                // 파워링크 전용 클래스 패턴
                className.includes('powerlink') ||
                className.includes('power-link') ||
                className.includes('naver-powerlink') ||
                className.includes('sponsored-powerlink') ||
                
                // 파워링크 전용 ID 패턴
                id.includes('powerlink') ||
                id.includes('naver-powerlink') ||
                
                // 파워링크 전용 링크 패턴
                href.includes('powerlink.naver.com') ||
                href.includes('ad.naver.com/powerlink') ||
                href.includes('ads.naver.com/powerlink') ||
                
                // 파워링크 전용 텍스트 패턴
                textContent.includes('파워링크') ||
                textContent.includes('powerlink') ||
                textContent.includes('PowerLink')
            ) {
                return true;
            }
            
            element = element.parentElement;
        }
        
        return false;
    }

    // 현재 IP 주소 가져오기 (실제 구현시 서버에서 가져와야 함)
    getCurrentIP() {
        // 실제 환경에서는 서버에서 IP를 가져와야 합니다
        // 현재는 예시 IP를 반환
        return '10.10.10.10';
    }

    // 경고 설정 가져오기
    getWarningConfig(level, clickCount) {
        const configs = {
            1: {
                title: '1단계',
                headerClass: 'warning-blue',
                contentClass: 'warning-blue-content',
                icon: '💻',
                message: '저희 사이트에 방문해 주셔서 감사합니다. 지금 클릭하신 링크는 저희 광고비가 지출되는 광고상품입니다. 즐겨찾기를 통한 방문으로 광고비가 절감되면, 더 좋은 서비스를 제공할 수 있습니다.',
                detail: null
            },
            2: {
                title: '2단계',
                headerClass: 'warning-orange',
                contentClass: 'warning-orange-content',
                icon: '🛡️',
                message: '광고클릭을 통해 여러 번 방문하셨습니다. 지금 클릭하신 링크는 저희 광고비가 지출되는 광고상품입니다. 많은 광고비가 지출됩니다. 즐겨찾기를 통한 방문으로 광고비가 절감되면, 더 좋은 서비스를 제공할 수 있습니다.',
                detail: `방문횟수: ${clickCount}회`
            },
            3: {
                title: '3단계',
                headerClass: 'warning-red',
                contentClass: 'warning-red-content',
                icon: '🚫',
                message: '광고클릭을 중지해주십시오. 접속자는 지속적인 광고클릭으로 당사 광고비를 과도하게 지출하게 하였습니다. 모든 IP는 추적관리되며, 이를 근거로 하여 영업 방해에 대한 법적조치를 취할 수 있습니다.',
                detail: `방문횟수: ${clickCount}회`
            }
        };
        
        return configs[level];
    }

    // 기존 팝업 제거
    removeExistingPopup() {
        const existingPopup = document.getElementById('warning-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
    }

    // 경고 팝업 닫기
    closeWarningPopup() {
        this.removeExistingPopup();
    }

    // 즐겨찾기 추가
    addToFavorites() {
        try {
            if (window.sidebar && window.sidebar.addPanel) { // Mozilla
                window.sidebar.addPanel(document.title, window.location.href, '');
            } else if (window.external && ('AddFavorite' in window.external)) { // IE
                window.external.AddFavorite(window.location.href, document.title);
            } else { // Webkit, Safari, Chrome
                alert('Ctrl+D를 눌러서 즐겨찾기에 추가하세요.');
            }
            this.closeWarningPopup();
        } catch (e) {
            alert('즐겨찾기 추가에 실패했습니다. Ctrl+D를 눌러서 수동으로 추가해주세요.');
        }
    }

    // 경고 팝업 스타일 적용
    applyWarningStyles() {
        if (document.getElementById('warning-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'warning-styles';
        style.textContent = `
            .warning-popup {
                position: fixed;
                top: 20px;
                left: 20px;
                max-width: 380px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInLeft 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                border: 3px solid;
                backdrop-filter: blur(10px);
                transform-origin: left center;
            }
            
            .warning-level-1 {
                border-color: #ff6b35;
                background: linear-gradient(135deg, #fff8e1, #ffecb3);
                box-shadow: 0 12px 40px rgba(255, 107, 53, 0.3), 0 0 0 1px rgba(255, 107, 53, 0.2);
            }
            
            .warning-level-2 {
                border-color: #ff5722;
                background: linear-gradient(135deg, #ffebee, #ffcdd2);
                box-shadow: 0 12px 40px rgba(255, 87, 34, 0.4), 0 0 0 1px rgba(255, 87, 34, 0.3);
            }
            
            .warning-level-3 {
                border-color: #d32f2f;
                background: linear-gradient(135deg, #ffebee, #ef9a9a);
                box-shadow: 0 12px 40px rgba(211, 47, 47, 0.5), 0 0 0 1px rgba(211, 47, 47, 0.4);
            }
            
            .warning-header {
                display: flex;
                align-items: center;
                padding: 18px 22px 12px;
                border-bottom: 2px solid rgba(0, 0, 0, 0.08);
                background: rgba(255, 255, 255, 0.1);
                border-radius: 16px 16px 0 0;
            }
            
            .warning-icon {
                font-size: 28px;
                margin-right: 15px;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
                animation: pulse 2s infinite;
            }
            
            .warning-title {
                font-weight: 700;
                font-size: 17px;
                color: #1a1a1a;
                flex: 1;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                letter-spacing: 0.5px;
            }
            
            .close-btn {
                background: rgba(0, 0, 0, 0.1);
                border: 2px solid rgba(0, 0, 0, 0.1);
                font-size: 22px;
                color: #495057;
                cursor: pointer;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-weight: bold;
            }
            
            .close-btn:hover {
                background: rgba(0, 0, 0, 0.2);
                color: #1a1a1a;
                transform: scale(1.1) rotate(90deg);
                border-color: rgba(0, 0, 0, 0.2);
            }
            
            .warning-content {
                padding: 18px 22px 22px;
                background: rgba(255, 255, 255, 0.05);
            }
            
            .warning-content p {
                margin: 0 0 18px 0;
                color: #2c3e50;
                line-height: 1.6;
                font-size: 15px;
                font-weight: 500;
                text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
            }
            
            .warning-actions {
                display: flex;
                gap: 12px;
            }
            
            .favorites-btn {
                background: linear-gradient(135deg, #2196f3, #1976d2);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                flex: 1;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            .favorites-btn:hover {
                background: linear-gradient(135deg, #1976d2, #1565c0);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
            }
            
            .favorites-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 10px rgba(33, 150, 243, 0.3);
            }
            
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%) scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: translateX(0) scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.1);
                }
            }
            
            @keyframes shake {
                0%, 100% {
                    transform: translateX(0);
                }
                10%, 30%, 50%, 70%, 90% {
                    transform: translateX(-2px);
                }
                20%, 40%, 60%, 80% {
                    transform: translateX(2px);
                }
            }
            
            .warning-level-2 .warning-icon {
                animation: shake 0.5s infinite;
            }
            
            .warning-level-3 .warning-icon {
                animation: shake 0.3s infinite;
            }
            
            /* 접속 정보 테이블 스타일 */
            .access-info-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .access-info-section h4 {
                margin: 0 0 15px 0;
                color: #2c3e50;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
            }
            
            .access-table-container {
                overflow-x: auto;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .access-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                font-size: 13px;
            }
            
            .access-table th {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                color: #495057;
                font-weight: 600;
                padding: 12px 8px;
                text-align: center;
                border-bottom: 2px solid #dee2e6;
                font-size: 12px;
            }
            
            .access-table td {
                padding: 10px 8px;
                text-align: center;
                border-bottom: 1px solid #f1f3f4;
                color: #6c757d;
                font-size: 12px;
            }
            
            .access-table tbody tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            
            .access-table tbody tr:hover {
                background-color: #e3f2fd;
            }
            
            /* 모바일 반응형 */
            @media (max-width: 768px) {
                .warning-popup {
                    top: 15px;
                    left: 15px;
                    right: 15px;
                    max-width: none;
                    width: auto;
                }
                
                .warning-header {
                    padding: 15px 18px 10px;
                }
                
                .warning-content {
                    padding: 15px 18px 18px;
                }
                
                .warning-title {
                    font-size: 16px;
                }
                
                .warning-content p {
                    font-size: 14px;
                }
                
                .favorites-btn {
                    padding: 14px 18px;
                    font-size: 15px;
                }
                
                .warning-icon {
                    font-size: 26px;
                }
                
                .access-table {
                    font-size: 12px;
                }
                
                .access-table th,
                .access-table td {
                    padding: 8px 6px;
                    font-size: 11px;
                }
            }
            
            /* 작은 모바일 화면 */
            @media (max-width: 480px) {
                .warning-popup {
                    top: 10px;
                    left: 10px;
                    right: 10px;
                }
                
                .warning-header {
                    padding: 12px 15px 8px;
                }
                
                .warning-content {
                    padding: 12px 15px 15px;
                }
                
                .warning-icon {
                    font-size: 24px;
                    margin-right: 10px;
                }
                
                .warning-title {
                    font-size: 15px;
                }
                
                .favorites-btn {
                    padding: 12px 16px;
                    font-size: 14px;
                }
                
                .access-table {
                    font-size: 11px;
                }
                
                .access-table th,
                .access-table td {
                    padding: 6px 4px;
                    font-size: 10px;
                }
                
                .access-info-section h4 {
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 테스트용: 수동으로 경고 팝업 표시
    showTestWarning(level = 1) {
        this.createWarningPopup(level, level === 1 ? 2 : level === 2 ? 5 : 8);
    }
    
    // 테스트용: 네이버 광고 클릭 시뮬레이션
    simulateNaverAdClick() {
        console.log('🧪 네이버 광고 클릭 시뮬레이션 시작');
        
        // 가짜 네이버 광고 요소 생성
        const fakeAdElement = document.createElement('div');
        fakeAdElement.className = 'naver-ad-test sponsored powerlink';
        fakeAdElement.id = 'test-ad-element';
        fakeAdElement.textContent = '네이버 파워링크 광고 테스트';
        fakeAdElement.style.cssText = `
            position: fixed;
            top: 50px;
            right: 50px;
            background: #ff6b35;
            color: white;
            padding: 20px;
            border-radius: 10px;
            cursor: pointer;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        
        // 클릭 이벤트 추가
        fakeAdElement.addEventListener('click', (e) => {
            console.log('🧪 테스트 파워링크 광고 클릭됨');
            this.handleClick(e);
        });
        
        document.body.appendChild(fakeAdElement);
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (fakeAdElement.parentElement) {
                fakeAdElement.remove();
            }
        }, 10000);
        
        console.log('🧪 테스트 파워링크 광고 요소가 생성되었습니다. 10초 후 자동으로 제거됩니다.');
    }
    
    // 테스트용: UTM 파라미터로 네이버 광고 클릭 시뮬레이션
    simulateNaverAdClickWithUTM() {
        console.log('🧪 UTM 파라미터로 네이버 광고 클릭 시뮬레이션 시작');
        
        // 현재 URL에 UTM 파라미터 추가
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('utm_source', 'naver');
        currentUrl.searchParams.set('utm_medium', 'cpc');
        currentUrl.searchParams.set('utm_campaign', 'powerlink_test');
        currentUrl.searchParams.set('utm_term', '렌트카');
        
        // URL 변경 (히스토리 API 사용)
        window.history.pushState({}, '', currentUrl.toString());
        
        // 페이지 새로고침 없이 UTM 파라미터 적용
        console.log('🔄 UTM 파라미터가 적용되었습니다:', currentUrl.toString());
        
        // 5초 후 원래 URL로 복원
        setTimeout(() => {
            window.history.back();
            console.log('🔄 UTM 파라미터가 제거되었습니다.');
        }, 5000);
        
        // 테스트 광고 클릭 시뮬레이션 실행
        this.simulateNaverAdClick();
    }
    
    // 네이버 광고 API 연동 메서드들
    async getNaverAdData() {
        try {
            console.log('🔗 네이버 광고 API 호출 시작');
            
            // 고객 ID가 없으면 먼저 조회
            if (!this.naverApiConfig.customerId) {
                await this.getCustomerId();
            }
            
            // 광고 데이터 조회
            const adData = await this.callNaverAdAPI('/ads/v1/campaigns', 'GET');
            console.log('📊 네이버 광고 데이터 조회 성공:', adData);
            
            return adData;
        } catch (error) {
            console.error('❌ 네이버 광고 API 호출 실패:', error);
            return null;
        }
    }
    
    // 고객 ID 조회
    async getCustomerId() {
        try {
            const response = await this.callNaverAdAPI('/ads/v1/customers', 'GET');
            if (response && response.customers && response.customers.length > 0) {
                this.naverApiConfig.customerId = response.customers[0].customerId;
                console.log('🆔 고객 ID 설정됨:', this.naverApiConfig.customerId);
            }
        } catch (error) {
            console.error('❌ 고객 ID 조회 실패:', error);
        }
    }
    
    // 네이버 광고 API 호출
    async callNaverAdAPI(endpoint, method = 'GET', data = null) {
        const timestamp = Date.now();
        const signature = this.generateSignature(endpoint, method, timestamp);
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp.toString(),
            'X-API-KEY': this.naverApiConfig.accessLicense,
            'X-Customer': this.naverApiConfig.customerId || '',
            'X-Signature': signature
        };
        
        const config = {
            method: method,
            headers: headers
        };
        
        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${this.naverApiConfig.baseUrl}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            throw new Error(`API 호출 실패: ${error.message}`);
        }
    }
    
    // API 서명 생성
    generateSignature(endpoint, method, timestamp) {
        const message = `${method}${endpoint}${timestamp}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // 간단한 해시 생성 (실제로는 더 안전한 방법 사용 권장)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32비트 정수로 변환
        }
        
        return hash.toString(16);
    }
    
    // 실제 네이버 광고 클릭인지 API로 확인
    async verifyNaverAdClick(clickData) {
        try {
            // UTM 파라미터가 있으면 우선 확인
            if (this.hasUTMParameters()) {
                return true;
            }
            
            // API로 광고 클릭 데이터 확인
            const adData = await this.getNaverAdData();
            if (adData) {
                // 클릭 데이터와 광고 데이터 비교 분석
                return this.analyzeAdClickData(clickData, adData);
            }
            
            return false;
        } catch (error) {
            console.error('❌ 네이버 광고 클릭 검증 실패:', error);
            return false;
        }
    }
    
    // UTM 파라미터 확인 (파워링크만)
    hasUTMParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('utm_source') && 
               urlParams.get('utm_source') === 'naver' && 
               urlParams.has('utm_medium') && 
               urlParams.get('utm_medium') === 'powerlink';
    }
    
    // 파워링크 광고 클릭 데이터 분석
    analyzeAdClickData(clickData, adData) {
        // 파워링크 광고 데이터와 클릭 데이터를 비교하여 실제 파워링크 클릭인지 판단
        
        const referrer = clickData.referrer;
        const timestamp = clickData.timestamp;
        
        // 파워링크 도메인에서의 접근 확인
        if (this.isNaverReferrer(referrer)) {
            return true;
        }
        
        // 파워링크 캠페인만 확인
        if (adData.campaigns) {
            for (const campaign of adData.campaigns) {
                // 파워링크 캠페인인지 확인
                if (campaign.status === 'ACTIVE' && 
                    campaign.type === 'POWERLINK' && 
                    this.isWithinAdSchedule(timestamp, campaign)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 광고 스케줄 내 시간인지 확인
    isWithinAdSchedule(timestamp, campaign) {
        // 캠페인 스케줄 정보가 있다면 시간대 확인
        // 실제 구현에서는 campaign.schedule 정보 활용
        return true; // 기본값
    }
}

// 시스템 초기화 및 전역 접근
const clickProtection = new ClickProtectionSystem();
window.clickProtection = clickProtection;

// 개발자 도구에서 확인 가능
console.log('🛡️ 클릭 보호 시스템이 활성화되었습니다.');
console.log('통계 확인: clickProtection.getStatistics()');
console.log('세션 차단: clickProtection.blockSession("session_id")');
console.log('세션 차단 해제: clickProtection.unblockSession("session_id")');
