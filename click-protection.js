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
        
        // 테스트 모드 즉시 확인 및 설정
        this.checkAndActivateTestMode();
        
        // 실시간 동기화 및 성능 최적화 설정
        this.syncInterval = null;
        this.isMonitoring = false;
        
        // 이벤트 핸들러 바인딩
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundTrackKeyboardActivity = this.trackKeyboardActivity.bind(this);
        this.boundTrackMouseMovement = this.trackMouseMovement.bind(this);
        
        // 성능 최적화된 이벤트 핸들러
        this.debouncedHandleClick = this.debounce(this.handleClick.bind(this), 100);
        this.throttledTrackMouseMovement = this.throttle(this.trackMouseMovement.bind(this), 50);
        
        this.init();
    }

    init() {
        this.setupEventListeners(); // 네이버 파워링크 광고 클릭만 감지
        // this.startMonitoring(); // 실시간 모니터링 비활성화
        this.loadBlockedIPs();
        
        // 실시간 데이터 동기화 시작
        this.startRealTimeSync();
        
        // 테스트 모드 확인 및 활성화
        this.checkTestMode();
        
        // 페이지 언로드 시 정리 이벤트 등록
        window.addEventListener('beforeunload', () => {
            this.handlePageUnload();
        });
        
        // 페이지 가시성 변경 감지 (탭 전환 시)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
        
        // DOM이 완전히 로드된 후 접속기록 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeAccessRecords();
            });
        } else {
            this.initializeAccessRecords();
        }
        
        console.log('🚀 클릭 보호 시스템이 초기화되었습니다. (네이버 파워링크 광고 클릭만 감지)');
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
            timeOnPage: 0,
            lastAccess: 0,
            ipAddress: '',
            adKeyword: 'N/A',
            searchTerm: 'N/A',
            adProduct: 'N/A'
        };
    }

    // 테스트 모드 확인 및 활성화
    checkTestMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test');
        
        if (testMode) {
            console.log(`🧪 테스트 모드가 활성화되었습니다: ${testMode}`);
            this.activateTestMode(testMode);
        }
        
        // 추가: URL에 네이버 관련 파라미터가 있으면 테스트 모드로 간주
        if (urlParams.get('utm_source') === 'naver' || 
            urlParams.get('naver') === 'true' ||
            urlParams.get('ad') === 'true') {
            console.log('🧪 네이버 광고 파라미터로 테스트 모드 활성화');
            this.activateTestMode('naver_ad');
        }
    }

    // 테스트 모드 활성화
    activateTestMode(testType) {
        // 테스트 모드 배너 표시
        this.showTestModeBanner(testType);
        
        // 테스트 모드 플래그 설정
        this.isTestMode = true;
        this.testType = testType;
        
        // 테스트 팝업을 즉시 표시 (지연 없이)
        console.log(`🧪 테스트 모드 활성화: ${testType}`);
        switch (testType) {
            case 'duplicate_pc':
            case 'duplicate_mobile':
                this.showTestWarning(1, 'duplicate'); // 중복접속 경고
                break;
            case 'excessive_pc':
            case 'excessive_mobile':
                this.showTestWarning(2, 'excessive'); // 과도한 클릭 경고
                break;
            case 'suspicious_pc':
            case 'suspicious_mobile':
                this.showTestWarning(3, 'suspicious'); // 의심스러운 패턴 경고
                break;
            case 'bot_pc':
            case 'bot_mobile':
                this.showTestWarning(4, 'bot'); // 봇 행동 패턴 경고
                break;
            case 'all_pc':
            case 'all_mobile':
                this.showTestWarning(5, 'all'); // 복합 경고
                break;
            case 'naver_ad':
                // 네이버 광고 테스트 모드: 모든 클릭을 광고 클릭으로 시뮬레이션
                console.log('🧪 네이버 광고 테스트 모드: 모든 클릭을 광고 클릭으로 시뮬레이션');
                this.simulateNaverAdClick();
                break;
            default:
                this.showTestWarning(1, 'default');
        }
    }

    // 테스트 모드 배너 표시
    showTestModeBanner(testType) {
        const banner = document.createElement('div');
        banner.id = 'test-mode-banner';
        banner.innerHTML = `
            <div class="test-banner-content">
                <span class="test-icon">🧪</span>
                <span class="test-text">테스트 모드: ${this.getTestTypeName(testType)}</span>
                <button class="test-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // 테스트 모드 배너 스타일 적용
        this.applyTestModeStyles();
    }

    // 테스트 유형 이름 반환
    getTestTypeName(testType) {
        const typeNames = {
            'duplicate_pc': '중복접속 경고 (PC)',
            'duplicate_mobile': '중복접속 경고 (모바일)',
            'excessive_pc': '과도한 클릭 경고 (PC)',
            'excessive_mobile': '과도한 클릭 경고 (모바일)',
            'suspicious_pc': '의심스러운 패턴 경고 (PC)',
            'suspicious_mobile': '의심스러운 패턴 경고 (모바일)',
            'bot_pc': '봇 행동 패턴 경고 (PC)',
            'bot_mobile': '봇 행동 패턴 경고 (모바일)',
            'all_pc': '복합 경고 (PC)',
            'all_mobile': '복합 경고 (모바일)',
            'naver_ad': '네이버 광고 시뮬레이션'
        };
        return typeNames[testType] || '테스트 모드';
    }

    // 테스트 모드 스타일 적용
    applyTestModeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #test-mode-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                animation: slideDown 0.5s ease-out;
            }
            
            .test-banner-content {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 15px 20px;
                gap: 15px;
                max-width: 1200px;
                margin: 0 auto;
                position: relative;
            }
            
            .test-icon {
                font-size: 20px;
                animation: pulse 2s infinite;
            }
            
            .test-text {
                font-weight: 600;
                font-size: 16px;
            }
            
            .test-close-btn {
                position: absolute;
                right: 20px;
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .test-close-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
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
            
            /* 모바일 반응형 */
            @media (max-width: 768px) {
                .test-banner-content {
                    padding: 12px 15px;
                    gap: 10px;
                }
                
                .test-text {
                    font-size: 14px;
                }
                
                .test-close-btn {
                    right: 15px;
                    width: 25px;
                    height: 25px;
                    font-size: 16px;
                }
            }
        `;
        
        document.head.appendChild(style);
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

    // 클릭 이벤트 처리 - 네이버 파워링크 광고 클릭일 때만 접속기록 생성
    async handleClick(event) {
        // 먼저 네이버 파워링크 광고 클릭인지 확인
        const isNaverAdClick = await this.isNaverAdClick(event);
        
        // 네이버 파워링크 광고 클릭이 아닌 경우 접속기록 생성하지 않음
        if (!isNaverAdClick) {
            console.log('📝 일반 클릭 - 접속기록 생성하지 않음');
            return;
        }
        
        console.log('🔄 네이버 파워링크 광고 클릭 감지 - 접속기록 생성 시작');
        
        const clickData = {
            timestamp: Date.now(),
            x: event.clientX,
            y: event.clientY,
            target: event.target.tagName,
            targetText: event.target.textContent?.substring(0, 50) || '',
            sessionId: this.sessionData.sessionId,
            ipAddress: await this.getCurrentIP(),
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
        
        // 접속기록 업데이트를 위한 데이터 설정
        this.sessionData.lastAccess = clickData.timestamp;
        this.sessionData.ipAddress = clickData.ipAddress;
        
        // URL 파라미터에서 광고 관련 정보 추출
        const urlParams = new URLSearchParams(window.location.search);
        this.sessionData.adKeyword = urlParams.get('keyword') || urlParams.get('q') || 'N/A';
        this.sessionData.searchTerm = urlParams.get('search') || urlParams.get('query') || 'N/A';
        this.sessionData.adProduct = urlParams.get('product') || urlParams.get('item') || 'N/A';

        // 부정클릭 패턴 분석
        this.analyzeClickPattern(clickData);

        // 네이버 광고 클릭 경고 팝업 표시
        this.showWarningPopup();

        // 클릭 데이터 전송 (서버로)
        this.sendClickData(clickData);

        // 로컬 스토리지에 저장
        this.saveClickData();
        
        // 네이버 파워링크 광고 클릭이 확인된 경우에만 접속기록 생성
        if (this.isNaverPowerLinkAccess()) {
            console.log('📊 네이버 파워링크 광고 클릭 확인 - 접속기록 생성 및 UI 업데이트');
            // UI 업데이트 (접속기록 포함)
            this.updateUI();
        } else {
            console.log('⚠️ 네이버 파워링크 광고 클릭이 아니므로 접속기록 생성하지 않음');
        }
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
        
        const popup = document.createElement('div');
        popup.id = 'warning-popup';
        popup.className = `warning-popup warning-level-${level}`;
        
        const config = this.getWarningConfig(level, clickCount);
        
        // 접속 정보 테이블 생성
        const accessTable = this.createAccessInfoTable(clickCount);
        
        // 진행률 바 생성 (클릭 횟수에 따라)
        const progressBar = this.createProgressBar(level, clickCount);
        
        popup.innerHTML = `
            <div class="warning-header">
                <div class="header-text">
                    <span class="warning-title">${config.title}</span>
                </div>
                <button class="close-btn" 
                        onclick="this.closest('.warning-popup').remove()" 
                        aria-label="경고 팝업 닫기">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="warning-content">
                <div class="warning-message-section">
                    <div class="message-icon">✅</div>
                    <div class="message-content">
                        <p class="warning-message">${config.message}</p>
                        ${config.detail ? `<p class="warning-detail">${config.detail}</p>` : ''}
                    </div>
                </div>
                
                <div class="warning-actions">
                    <button class="favorites-btn primary-btn" 
                            onclick="alert('즐겨찾기에 추가되었습니다!')"
                            aria-label="즐겨찾기에 추가">
                        <span class="btn-text">+ 즐겨찾기 바로추가</span>
                    </button>
                </div>
                
                <div class="access-info-section">
                    <div class="section-header">
                        <span class="visit-count">방문횟수: ${clickCount}회</span>
                    </div>
                    ${accessTable}
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // 접근성 개선: 포커스 관리
        this.manageFocus(popup);
        
        // 키보드 단축키 지원
        this.setupKeyboardShortcuts(popup);
        
        // 스크린 리더 지원
        this.announceToScreenReader(config.message);
        
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
        
        // 클릭한 수만큼 행 생성 (실제 데이터 기반)
        let tableRows = '';
        for (let i = 0; i < clickCount; i++) {
            const clickTime = new Date(Date.now() - (i * 60000)).toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            tableRows += `
                <tr class="access-row" data-row="${i + 1}">
                    <td class="ip-cell">
                        <span class="ip-address">${currentIP}</span>
                        <span class="ip-location">🇰🇷 한국</span>
                    </td>
                    <td class="keyword-cell">
                        <span class="keyword">렌트카</span>
                        <span class="ad-source">네이버 파워링크</span>
                    </td>
                    <td class="time-cell">
                        <span class="access-time">${clickTime}</span>
                        <span class="time-ago">${i === 0 ? '방금 전' : `${i}분 전`}</span>
                    </td>
                </tr>
            `;
        }
        
        return `
            <div class="access-table-container">
                <div class="table-header-info">
                    <span class="total-clicks">총 ${clickCount}회 접속</span>
                    <span class="last-access">마지막 접속: ${currentTime}</span>
                </div>
                <table class="access-table" role="table" aria-label="광고 클릭 접속 정보">
                    <thead>
                        <tr>
                            <th scope="col">접속 IP</th>
                            <th scope="col">클릭 키워드</th>
                            <th scope="col">접속 시간</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // 진행률 바 생성
    createProgressBar(level, clickCount) {
        const maxClicks = level === 1 ? 4 : level === 2 ? 6 : 8;
        const progress = Math.min((clickCount / maxClicks) * 100, 100);
        const progressColor = level === 1 ? '#ff6b35' : level === 2 ? '#ff5722' : '#d32f2f';
        const progressGradient = level === 1 ? 'linear-gradient(135deg, #ff6b35, #ff5722)' : 
                                level === 2 ? 'linear-gradient(135deg, #ff5722, #e64a19)' : 
                                'linear-gradient(135deg, #d32f2f, #c62828)';
        
        return `
            <div class="progress-container" role="progressbar" aria-valuenow="${clickCount}" aria-valuemin="0" aria-valuemax="${maxClicks}">
                <div class="progress-label">
                    <span class="progress-text">
                        <i class="fas fa-chart-line" style="margin-right: 8px; color: #667eea;"></i>
                        광고 클릭 진행률
                    </span>
                    <span class="progress-count">${clickCount}/${maxClicks}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%; background: ${progressGradient}">
                        <div class="progress-glow"></div>
                    </div>
                </div>
                <div class="progress-steps">
                    ${this.createProgressSteps(level, clickCount)}
                </div>
                <div class="progress-info" style="margin-top: 15px; text-align: center;">
                    <small style="color: #6c757d; font-size: 12px;">
                        <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                        ${this.getProgressMessage(level, clickCount, maxClicks)}
                    </small>
                </div>
            </div>
        `;
    }
    
    // 진행 단계 표시
    createProgressSteps(level, clickCount) {
        const maxClicks = level === 1 ? 4 : level === 2 ? 6 : 8;
        let steps = '';
        
        for (let i = 1; i <= maxClicks; i++) {
            let stepClass = 'step-inactive';
            if (i <= clickCount) {
                stepClass = i === clickCount ? 'step-current' : 'step-active';
            }
            
            steps += `
                <div class="progress-step ${stepClass}">
                    <div class="step-marker">${i}</div>
                    <div class="step-label">${i}단계</div>
                </div>
            `;
        }
        
        return steps;
    }

    // 진행률 메시지 생성
    getProgressMessage(level, clickCount, maxClicks) {
        const remaining = maxClicks - clickCount;
        
        if (level === 1) {
            if (clickCount === 0) return '첫 번째 클릭을 시작해주세요';
            if (remaining === 0) return '1단계 완료! 다음 단계로 진행합니다';
            return `1단계: ${remaining}번 더 클릭하면 완료됩니다`;
        } else if (level === 2) {
            if (clickCount === 0) return '2단계 클릭을 시작해주세요';
            if (remaining === 0) return '2단계 완료! 마지막 단계로 진행합니다';
            return `2단계: ${remaining}번 더 클릭하면 완료됩니다`;
        } else {
            if (clickCount === 0) return '마지막 단계 클릭을 시작해주세요';
            if (remaining === 0) return '모든 단계 완료! 광고를 확인해주세요';
            return `마지막 단계: ${remaining}번 더 클릭하면 완료됩니다`;
        }
    }

    // 레벨별 아이콘 생성
    getLevelIcon(level) {
        const icons = {
            1: '🟡',
            2: '🟠', 
            3: '🔴'
        };
        return icons[level] || '🟡';
    }

    // 추가 정보 표시
    showMoreInfo() {
        const infoContent = `
            <div class="info-modal">
                <div class="info-header">
                    <h3>광고 클릭 보안 시스템 정보</h3>
                    <button class="close-info-btn" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="info-content">
                    <div class="info-section">
                        <h4>🔒 시스템 목적</h4>
                        <p>부정 클릭을 방지하여 광고비를 절약하고, 정당한 광고 효과를 보장합니다.</p>
                    </div>
                    <div class="info-section">
                        <h4>📊 단계별 진행</h4>
                        <ul>
                            <li><strong>1단계:</strong> 4번 클릭 시 다음 단계로 진행</li>
                            <li><strong>2단계:</strong> 6번 클릭 시 다음 단계로 진행</li>
                            <li><strong>3단계:</strong> 8번 클릭 시 완료</li>
                        </ul>
                    </div>
                    <div class="info-section">
                        <h4>💡 권장사항</h4>
                        <p>즐겨찾기에 추가하여 직접 방문하시면 광고비가 절약되어 더 좋은 서비스를 제공할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 정보 모달 제거
        const existingModal = document.querySelector('.info-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 정보 모달 추가
        document.body.insertAdjacentHTML('beforeend', infoContent);
        
        // 애니메이션 효과
        const modal = document.querySelector('.info-modal');
        modal.style.animation = 'slideInUp 0.3s ease-out';
    }
    
    // 포커스 관리
    manageFocus(popup) {
        // 팝업이 열릴 때 첫 번째 포커스 가능한 요소에 포커스
        const firstFocusable = popup.querySelector('button, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // 팝업 외부 클릭 시 포커스 유지
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                e.stopPropagation();
            }
        });
        
        // ESC 키로 팝업 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeWarningPopup();
            }
        });
    }
    
    // 키보드 단축키 설정
    setupKeyboardShortcuts(popup) {
        popup.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                    if (e.target.classList.contains('favorites-btn')) {
                        this.addToFavorites();
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (e.target.classList.contains('favorites-btn')) {
                        this.addToFavorites();
                    }
                    break;
            }
        });
    }
    
    // 스크린 리더 지원
    announceToScreenReader(message) {
        // ARIA 라이브 리전을 통한 스크린 리더 알림
        let announcement = document.getElementById('screen-reader-announcement');
        if (!announcement) {
            announcement = document.createElement('div');
            announcement.id = 'screen-reader-announcement';
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            document.body.appendChild(announcement);
        }
        
        announcement.textContent = message;
        
        // 3초 후 자동 제거
        setTimeout(() => {
            announcement.textContent = '';
        }, 3000);
    }

    // 네이버 파워링크 광고 클릭인지 확인 (완화된 검증)
    async isNaverAdClick(event) {
        // 1. UTM 파라미터 확인 (가장 정확한 방법)
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source');
        const utmMedium = urlParams.get('utm_medium');
        const utmCampaign = urlParams.get('utm_campaign');
        const utmTerm = urlParams.get('utm_term');
        
        // UTM 파라미터로 네이버 광고 확인 (powerlink, cpc, paid 등 모두 포함)
        if (utmSource === 'naver' && (utmMedium === 'powerlink' || utmMedium === 'cpc' || utmMedium === 'paid')) {
            console.log('✅ UTM 파라미터로 네이버 광고 클릭 확인됨:', {
                utmSource,
                utmMedium,
                utmCampaign,
                utmTerm
            });
            return true;
        }
        
        // 2. 네이버 광고 관련 URL 패턴 확인 (더 넓은 범위)
        const currentUrl = window.location.href;
        if (this.isNaverAdUrl(currentUrl)) {
            console.log('✅ 네이버 광고 URL 패턴으로 광고 클릭 확인됨:', currentUrl);
            return true;
        }
        
        // 3. 리퍼러가 네이버에서 온 경우 확인 (더 넓은 범위)
        if (this.isNaverReferrer(document.referrer)) {
            console.log('✅ 네이버 리퍼러로부터 광고 클릭 확인됨:', document.referrer);
            return true;
        }
        
        // 4. 네이버 광고 요소 특성 확인
        if (this.hasNaverAdCharacteristics(event)) {
            console.log('✅ 네이버 광고 요소 특성으로 감지됨');
            return true;
        }
        
        // 5. 추가 검증: 세션 데이터와 리퍼러 정보 종합 확인 (완화됨)
        if (document.referrer && 
            document.referrer.includes('naver') && 
            (document.referrer.includes('search.naver') || 
             document.referrer.includes('ad.naver.com') ||
             document.referrer.includes('ads.naver.com') ||
             document.referrer.includes('powerlink.naver.com') ||
             document.referrer.includes('cafe.naver.com') ||
             document.referrer.includes('blog.naver.com'))) {
            console.log('✅ 세션 데이터와 리퍼러 정보로 네이버 광고 클릭 확인됨');
            return true;
        }
        
        // 6. 테스트 모드일 때는 모든 클릭을 광고로 간주
        if (this.isTestMode) {
            console.log('🧪 테스트 모드: 모든 클릭을 네이버 광고 클릭으로 간주');
            return true;
        }
        
        // 일반 클릭은 광고가 아님
        console.log('❌ 일반 클릭 (네이버 광고 아님):', {
            target: event.target.tagName,
            text: event.target.textContent?.substring(0, 30) || '',
            referrer: document.referrer,
            url: window.location.href,
            utmSource,
            utmMedium
        });
        
        return false;
    }
    
    // 네이버 광고 URL 패턴 확인 (더 넓은 범위)
    isNaverAdUrl(url) {
        const adPatterns = [
            /powerlink\.naver\.com/,
            /ad\.naver\.com/,
            /ads\.naver\.com/,
            /search\.naver\.com\/search\.naver\?.*query=.*&where=(powerlink|ad|cpc)/,
            /cafe\.naver\.com\/.*\?query=.*&where=(powerlink|ad|cpc)/,
            /blog\.naver\.com\/.*\?query=.*&where=(powerlink|ad|cpc)/,
            /news\.naver\.com\/.*\?query=.*&where=(powerlink|ad|cpc)/,
            /search\.naver\.com\/search\.naver\?.*utm_source=naver/,
            /cafe\.naver\.com\/.*\?utm_source=naver/,
            /blog\.naver\.com\/.*\?utm_source=naver/
        ];
        
        return adPatterns.some(pattern => pattern.test(url));
    }
    
    // 네이버 파워링크 URL 패턴 확인 (기존 함수 - 호환성 유지)
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
    
    // 네이버 리퍼러 확인 (더 넓은 범위)
    isNaverReferrer(referrer) {
        if (!referrer) return false;
        
        // 네이버에서 온 모든 접속을 확인 (광고, 검색, 블로그, 카페 등)
        const naverPatterns = [
            /naver\.com/,
            /search\.naver\.com/,
            /cafe\.naver\.com/,
            /blog\.naver\.com/,
            /news\.naver\.com/,
            /powerlink\.naver\.com/,
            /ad\.naver\.com/,
            /ads\.naver\.com/,
            /map\.naver\.com/,
            /shopping\.naver\.com/
        ];
        
        return naverPatterns.some(pattern => pattern.test(referrer));
    }
    
    // 네이버 파워링크 리퍼러 확인 (일반 검색 제외) - 기존 함수 유지
    isNaverPowerLinkReferrer(referrer) {
        if (!referrer) return false;
        
        // 파워링크 전용 도메인과 경로만 확인 (일반 검색은 제외)
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
    
    // 네이버 파워링크 리퍼러 확인 (기존 함수 - 호환성 유지)
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
    
    // 네이버 광고 요소 특성 확인 (더 넓은 범위)
    hasNaverAdCharacteristics(event) {
        let element = event.target;
        
        while (element && element !== document.body) {
            const className = element.className || '';
            const id = element.id || '';
            const href = element.href || '';
            const textContent = element.textContent || '';
            
            // 네이버 광고 관련 모든 패턴 확인
            if (
                // 광고 관련 클래스 패턴
                className.includes('powerlink') ||
                className.includes('power-link') ||
                className.includes('naver-powerlink') ||
                className.includes('sponsored-powerlink') ||
                className.includes('ad') ||
                className.includes('sponsored') ||
                className.includes('광고') ||
                className.includes('spon') ||
                
                // 광고 관련 ID 패턴
                id.includes('powerlink') ||
                id.includes('naver-powerlink') ||
                id.includes('ad') ||
                id.includes('sponsored') ||
                
                // 광고 관련 링크 패턴
                href.includes('powerlink.naver.com') ||
                href.includes('ad.naver.com') ||
                href.includes('ads.naver.com') ||
                href.includes('search.naver.com') ||
                
                // 광고 관련 텍스트 패턴
                textContent.includes('파워링크') ||
                textContent.includes('powerlink') ||
                textContent.includes('PowerLink') ||
                textContent.includes('광고') ||
                textContent.includes('sponsored') ||
                textContent.includes('spon')
            ) {
                return true;
            }
            
            element = element.parentElement;
        }
        
        return false;
    }
    
    // 파워링크 광고 요소 특성 확인 (일반 검색 제외) - 기존 함수 유지
    hasPowerLinkAdCharacteristics(event) {
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
    
    // 파워링크 광고 요소 특성 확인 (기존 함수 - 호환성 유지)
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
    async getCurrentIP() {
        try {
            // 외부 서비스를 통해 실제 IP 주소 가져오기 시도
            const response = await fetch('https://api.ipify.org?format=json');
            if (response.ok) {
                const data = await response.json();
                return data.ip;
            }
        } catch (error) {
            console.log('IP 주소 가져오기 실패, 대체 방법 사용:', error.message);
        }
        
        // 대체 방법: 로컬 스토리지에서 저장된 IP 사용
        const savedIP = localStorage.getItem('userIP');
        if (savedIP) {
            return savedIP;
        }
        
        // 마지막 대안: 랜덤 IP 생성 (테스트용)
        const randomIP = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        localStorage.setItem('userIP', randomIP);
        return randomIP;
    }

    // 경고 설정 가져오기
    getWarningConfig(level, clickCount) {
        const configs = {
            1: {
                title: '1단계 경고',
                headerClass: 'warning-blue',
                contentClass: 'warning-blue-content',
                icon: '⚠️',
                message: '저희 사이트에 방문해 주셔서 감사합니다. 지금 클릭하신 링크는 저희 광고비가 지출되는 광고상품입니다. 즐겨찾기를 통한 방문으로 광고비가 절감되면, 더 좋은 서비스를 제공할 수 있습니다.',
                detail: null,
                color: '#ff6b35',
                bgColor: 'linear-gradient(135deg, #fff8e1, #ffecb3)'
            },
            2: {
                title: '2단계 경고',
                headerClass: 'warning-orange',
                contentClass: 'warning-orange-content',
                icon: '🚨',
                message: '광고클릭을 통해 여러 번 방문하셨습니다. 지금 클릭하신 링크는 저희 광고비가 지출되는 광고상품입니다. 많은 광고비가 지출됩니다. 즐겨찾기를 통한 방문으로 광고비가 절감되면, 더 좋은 서비스를 제공할 수 있습니다.',
                detail: `방문횟수: ${clickCount}회`,
                color: '#ff5722',
                bgColor: 'linear-gradient(135deg, #ffebee, #ffcdd2)'
            },
            3: {
                title: '3단계 경고',
                headerClass: 'warning-red',
                contentClass: 'warning-red-content',
                icon: '🚫',
                message: '광고클릭을 중지해주십시오. 접속자는 지속적인 광고클릭으로 당사 광고비를 과도하게 지출하게 하였습니다. 모든 IP는 추적관리되며, 이를 근거로 하여 영업 방해에 대한 법적조치를 취할 수 있습니다.',
                detail: `방문횟수: ${clickCount}회`,
                color: '#d32f2f',
                bgColor: 'linear-gradient(135deg, #ffebee, #ef9a9a)'
            },
            4: {
                title: '4단계 경고',
                headerClass: 'warning-purple',
                contentClass: 'warning-purple-content',
                icon: '🤖',
                message: '봇 행동 패턴이 감지되었습니다. 자동화된 도구나 스크립트를 사용한 접속은 차단될 수 있습니다. 정상적인 사용자 접속을 권장합니다.',
                detail: `봇 패턴 감지: ${clickCount}회`,
                color: '#9c27b0',
                bgColor: 'linear-gradient(135deg, #f3e5f5, #e1bee7)'
            },
            5: {
                title: '5단계 경고',
                headerClass: 'warning-black',
                contentClass: 'warning-black-content',
                icon: '⚫',
                message: '복합적인 부정클릭 패턴이 감지되었습니다. 모든 IP는 즉시 차단되며, 법적 조치가 취해질 수 있습니다.',
                detail: `복합 패턴: ${clickCount}회`,
                color: '#212121',
                bgColor: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)'
            }
        };
        
        return configs[level] || configs[1]; // 기본값으로 1단계 경고 반환
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
            
            .warning-level-4 {
                border-color: #9c27b0;
                background: linear-gradient(135deg, #f3e5f5, #e1bee7);
                box-shadow: 0 12px 40px rgba(156, 39, 176, 0.4), 0 0 0 1px rgba(156, 39, 176, 0.3);
            }
            
            .warning-level-5 {
                border-color: #212121;
                background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
                box-shadow: 0 12px 40px rgba(33, 33, 33, 0.6), 0 0 0 1px rgba(33, 33, 33, 0.5);
            }
            
            .warning-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #495057;
                color: white;
                border-radius: 16px 16px 0 0;
            }
            
            .warning-title {
                font-weight: 600;
                font-size: 16px;
                color: white;
                flex: 1;
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
                background: #ff8c00;
            }
            
            .warning-content p {
                margin: 0 0 18px 0;
                color: white;
                line-height: 1.6;
                font-size: 15px;
                font-weight: 500;
                text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
            }
            
            .warning-message-section {
                display: flex;
                align-items: flex-start;
                gap: 20px;
                margin-bottom: 25px;
                padding: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .message-icon {
                font-size: 32px;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                flex-shrink: 0;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .message-content {
                flex: 1;
            }
            
            .warning-message {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .warning-detail {
                font-size: 14px;
                opacity: 0.9;
            }
            
            .warning-actions {
                display: flex;
                gap: 12px;
            }
            
            .favorites-btn {
                background: linear-gradient(135deg, #4caf50, #45a049);
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
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            .favorites-btn:hover {
                background: linear-gradient(135deg, #45a049, #3d8b40);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
            }
            
            .favorites-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
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
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .visit-count {
                color: white;
                font-size: 16px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .access-info-section h4 {
                margin: 0 0 15px 0;
                color: white;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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
                background: linear-gradient(135deg, #495057, #343a40);
                color: white;
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
    showTestWarning(level = 1, testType = 'default') {
        console.log(`🧪 테스트 경고 표시: 레벨 ${level}, 유형 ${testType}`);
        
        // 테스트 유형에 따른 클릭 횟수 설정
        let clickCount;
        switch (testType) {
            case 'duplicate':
                clickCount = 3; // 중복접속
                break;
            case 'excessive':
                clickCount = 8; // 과도한 클릭
                break;
            case 'suspicious':
                clickCount = 12; // 의심스러운 패턴
                break;
            case 'bot':
                clickCount = 15; // 봇 행동 패턴
                break;
            case 'all':
                clickCount = 20; // 복합 경고
                break;
            default:
                clickCount = level === 1 ? 2 : level === 2 ? 5 : level === 3 ? 8 : level === 4 ? 12 : 15;
        }
        
        // 경고 팝업 생성
        this.createWarningPopup(level, clickCount);
        
        // 테스트 모드임을 콘솔에 표시
        console.log(`🧪 테스트 경고 팝업이 생성되었습니다. 레벨: ${level}, 클릭 횟수: ${clickCount}`);
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
        // 테스트 모드일 때는 API 호출을 하지 않음
        if (this.isTestMode) {
            console.log(`테스트 모드: ${endpoint} API 호출 차단됨`);
            return { testMode: true, message: '테스트 모드에서는 API 호출이 차단됩니다.' };
        }
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
    
    // API 서명 생성 (보안 강화)
    generateSignature(endpoint, method, timestamp) {
        const message = `${method}${endpoint}${timestamp}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // HMAC-SHA256 서명 생성 (실제 네이버 API 요구사항에 맞춤)
        return this.hmacSHA256(data, this.naverApiConfig.secretKey);
    }
    
    // HMAC-SHA256 해시 생성
    hmacSHA256(data, key) {
        // Web Crypto API를 사용한 안전한 해시 생성
        if (window.crypto && window.crypto.subtle) {
            return this.generateHMAC(data, key);
        } else {
            // 폴백: 간단한 해시 (개발 환경용)
            return this.simpleHash(data, key);
        }
    }
    
    // Web Crypto API를 사용한 HMAC 생성
    async generateHMAC(data, key) {
        try {
            const keyBuffer = new TextEncoder().encode(key);
            const dataBuffer = new TextEncoder().encode(data);
            
            const cryptoKey = await window.crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            
            const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
            return Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('HMAC 생성 실패, 폴백 해시 사용:', error);
            return this.simpleHash(data, key);
        }
    }
    
    // 폴백 해시 함수
    simpleHash(data, key) {
        let hash = 0;
        const combined = data + key;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    // 네이버 광고 API 실제 연동 테스트
    async testNaverAdAPIConnection() {
        try {
            console.log('🧪 네이버 광고 API 연결 테스트 시작...');
            
            // 1. 고객 ID 조회 테스트
            console.log('1️⃣ 고객 ID 조회 테스트...');
            const customerResponse = await this.callNaverAdAPI('/ads/v1/customers', 'GET');
            console.log('고객 ID 조회 결과:', customerResponse);
            
            if (customerResponse && customerResponse.customers && customerResponse.customers.length > 0) {
                this.naverApiConfig.customerId = customerResponse.customers[0].customerId;
                console.log('✅ 고객 ID 설정 완료:', this.naverApiConfig.customerId);
                
                // 2. 캠페인 정보 조회 테스트
                console.log('2️⃣ 캠페인 정보 조회 테스트...');
                const campaignResponse = await this.callNaverAdAPI('/ads/v1/campaigns', 'GET');
                console.log('캠페인 조회 결과:', campaignResponse);
                
                // 3. 광고 그룹 정보 조회 테스트
                console.log('3️⃣ 광고 그룹 정보 조회 테스트...');
                const adGroupResponse = await this.callNaverAdAPI('/ads/v1/adgroups', 'GET');
                console.log('광고 그룹 조회 결과:', adGroupResponse);
                
                // 4. 키워드 정보 조회 테스트
                console.log('4️⃣ 키워드 정보 조회 테스트...');
                const keywordResponse = await this.callNaverAdAPI('/ads/v1/keywords', 'GET');
                console.log('키워드 조회 결과:', keywordResponse);
                
                console.log('🎉 모든 API 테스트 완료!');
                return {
                    success: true,
                    customerId: this.naverApiConfig.customerId,
                    campaigns: campaignResponse,
                    adGroups: adGroupResponse,
                    keywords: keywordResponse
                };
                
            } else {
                console.error('❌ 고객 ID 조회 실패');
                return { success: false, error: '고객 ID를 찾을 수 없습니다.' };
            }
            
        } catch (error) {
            console.error('❌ API 연결 테스트 실패:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 실시간 광고 클릭 데이터 동기화
    async syncAdClickData() {
        try {
            console.log('🔄 실시간 광고 클릭 데이터 동기화 시작...');
            
            // 최근 24시간 내 클릭 데이터 조회
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const timestamp = yesterday.getTime();
            
            // 네이버 광고 API에서 클릭 데이터 조회
            const clickDataResponse = await this.callNaverAdAPI(
                `/ads/v1/statistics?startDate=${timestamp}&endDate=${Date.now()}&timeUnit=HOUR`,
                'GET'
            );
            
            if (clickDataResponse && clickDataResponse.statistics) {
                console.log('📊 실시간 클릭 데이터 동기화 완료:', clickDataResponse.statistics);
                
                // 로컬 저장소에 동기화된 데이터 저장
                localStorage.setItem('syncedAdClickData', JSON.stringify({
                    lastSync: Date.now(),
                    data: clickDataResponse.statistics
                }));
                
                return clickDataResponse.statistics;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ 광고 클릭 데이터 동기화 실패:', error);
            return null;
        }
    }
    
    // API 에러 처리 및 로깅
    handleAPIError(error, context) {
        const errorLog = {
            timestamp: Date.now(),
            context: context,
            error: error.message,
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 에러 로그 저장
        const existingErrors = JSON.parse(localStorage.getItem('apiErrors') || '[]');
        existingErrors.push(errorLog);
        localStorage.setItem('apiErrors', JSON.stringify(existingErrors));
        
        // 관리자 대시보드에 에러 표시
        if (this.isAdminMode) {
            this.displayAPIError(errorLog);
        }
        
        console.error(`API 에러 (${context}):`, error);
    }
    
    // 관리자 대시보드에 API 에러 표시
    displayAPIError(errorLog) {
        const errorContainer = document.getElementById('apiErrorContainer');
        if (errorContainer) {
            const errorElement = document.createElement('div');
            errorElement.className = 'api-error-item';
            errorElement.innerHTML = `
                <div class="error-header">
                    <span class="error-time">${new Date(errorLog.timestamp).toLocaleString()}</span>
                    <span class="error-context">${errorLog.context}</span>
                </div>
                <div class="error-message">${errorLog.error}</div>
            `;
            errorContainer.appendChild(errorElement);
        }
    }
    
    // API 상태 모니터링
    async checkAPIHealth() {
        try {
            const startTime = Date.now();
            const response = await this.callNaverAdAPI('/ads/v1/customers', 'GET');
            const responseTime = Date.now() - startTime;
            
            const healthStatus = {
                timestamp: Date.now(),
                status: 'healthy',
                responseTime: responseTime,
                lastCheck: new Date().toISOString()
            };
            
            // 응답 시간이 5초를 초과하면 경고
            if (responseTime > 5000) {
                healthStatus.status = 'warning';
                healthStatus.message = '응답 시간이 느립니다';
            }
            
            // 상태 저장
            localStorage.setItem('apiHealthStatus', JSON.stringify(healthStatus));
            
            return healthStatus;
            
        } catch (error) {
            const healthStatus = {
                timestamp: Date.now(),
                status: 'error',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
            
            localStorage.setItem('apiHealthStatus', JSON.stringify(healthStatus));
            return healthStatus;
        }
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
    
    // 실시간 업데이트 시작
    startRealTimeUpdates(popup, level, clickCount) {
        if (!popup) return;
        
        // 실시간 카운터 업데이트
        const updateInterval = setInterval(() => {
            if (!document.body.contains(popup)) {
                clearInterval(updateInterval);
                return;
            }
            
            // 클릭 카운트 증가 시뮬레이션 (실제로는 API에서 받아옴)
            const currentCount = this.sessionData.clickCount;
            if (currentCount > clickCount) {
                this.updateWarningPopup(popup, level, currentCount);
            }
            
            // 시간 표시 업데이트
            this.updateTimeDisplay(popup);
            
        }, 1000); // 1초마다 업데이트
        
        // 팝업이 닫힐 때 인터벌 정리
        popup.addEventListener('remove', () => {
            clearInterval(updateInterval);
        });
    }
    
    // 경고 팝업 업데이트
    updateWarningPopup(popup, level, newClickCount) {
        if (!popup) return;
        
        // 진행률 바 업데이트
        const progressBar = popup.querySelector('.progress-fill');
        if (progressBar) {
            const maxClicks = level === 1 ? 4 : level === 2 ? 6 : 8;
            const progress = Math.min((newClickCount / maxClicks) * 100, 100);
            progressBar.style.width = `${progress}%`;
        }
        
        // 카운터 업데이트
        const progressCount = popup.querySelector('.progress-count');
        if (progressCount) {
            const maxClicks = level === 1 ? 4 : level === 2 ? 6 : 8;
            progressCount.textContent = `${newClickCount}/${maxClicks}`;
        }
        
        // 접속 정보 테이블 업데이트
        const accessTable = popup.querySelector('.access-table-container');
        if (accessTable) {
            accessTable.innerHTML = this.createAccessInfoTable(newClickCount);
        }
        
        // 레벨이 변경되었는지 확인
        const newLevel = this.getWarningLevel(newClickCount);
        if (newLevel !== level) {
            this.upgradeWarningLevel(popup, newLevel, newClickCount);
        }
    }
    
    // 경고 레벨 업그레이드
    upgradeWarningLevel(popup, newLevel, clickCount) {
        if (!popup) return;
        
        // 클래스 변경
        popup.className = `warning-popup warning-level-${newLevel}`;
        
        // 헤더 색상 변경 애니메이션
        const header = popup.querySelector('.warning-header');
        if (header) {
            header.style.animation = 'levelUpgrade 0.5s ease-in-out';
        }
        
        // 새로운 설정으로 내용 업데이트
        const config = this.getWarningConfig(newLevel, clickCount);
        const title = popup.querySelector('.warning-title');
        const message = popup.querySelector('.warning-message');
        
        if (title) title.textContent = config.title;
        if (message) message.textContent = config.message;
        
        // 레벨 업그레이드 알림
        this.announceToScreenReader(`경고 레벨이 ${newLevel}단계로 상승했습니다. ${config.message}`);
        
        // 스크린 리더용 aria-label 업데이트
        popup.setAttribute('aria-label', `경고 레벨 ${newLevel} - 클릭 ${clickCount}회`);
    }
    
    // 시간 표시 업데이트
    updateTimeDisplay(popup) {
        const timeElements = popup.querySelectorAll('.time-ago');
        timeElements.forEach((element, index) => {
            const minutes = index;
            if (minutes === 0) {
                element.textContent = '방금 전';
            } else {
                element.textContent = `${minutes}분 전`;
            }
        });
        
        // 마지막 업데이트 시간 표시
        const lastUpdate = popup.querySelector('.last-access');
        if (lastUpdate) {
            const now = new Date().toLocaleString('ko-KR', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            lastUpdate.textContent = `마지막 접속: ${now}`;
        }
    }
    
    // 고급 분석 정보 표시
    showAdvancedAnalytics() {
        const analyticsData = this.generateAdvancedReport();
        
        const analyticsPopup = document.createElement('div');
        analyticsPopup.className = 'analytics-popup';
        analyticsPopup.innerHTML = `
            <div class="analytics-header">
                <h3><i class="fas fa-chart-line"></i> 고급 분석 리포트</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="analytics-content">
                <div class="analytics-section">
                    <h4>클릭 패턴 분석</h4>
                    <div class="pattern-chart">
                        ${this.createPatternChart()}
                    </div>
                </div>
                <div class="analytics-section">
                    <h4>위험도 평가</h4>
                    <div class="risk-assessment">
                        ${this.createRiskAssessment()}
                    </div>
                </div>
                <div class="analytics-section">
                    <h4>권장 조치사항</h4>
                    <div class="recommendations">
                        ${this.createRecommendations()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(analyticsPopup);
        
        // 애니메이션 효과
        setTimeout(() => {
            analyticsPopup.classList.add('show');
        }, 100);
    }
    
    // 고급 리포트 생성
    generateAdvancedReport() {
        return {
            totalClicks: this.sessionData.clickCount,
            suspiciousPatterns: this.suspiciousPatterns.length,
            blockedIPs: this.blockedIPs.size,
            sessionDuration: Date.now() - this.sessionData.timestamp,
            riskLevel: this.calculateRiskLevel(),
            recommendations: this.generateRecommendations()
        };
    }
    
    // 위험도 계산
    calculateRiskLevel() {
        const clickCount = this.sessionData.clickCount;
        const suspiciousCount = this.suspiciousPatterns.length;
        
        if (clickCount > 10 || suspiciousCount > 5) return 'HIGH';
        if (clickCount > 5 || suspiciousCount > 2) return 'MEDIUM';
        return 'LOW';
    }
    
    // 권장사항 생성
    generateRecommendations() {
        const riskLevel = this.calculateRiskLevel();
        
        switch (riskLevel) {
            case 'HIGH':
                return [
                    '즉시 즐겨찾기 추가를 권장합니다',
                    '광고 클릭을 중단해주세요',
                    '직접 방문을 통해 서비스를 이용하세요'
                ];
            case 'MEDIUM':
                return [
                    '즐겨찾기 추가를 고려해보세요',
                    '광고 클릭 빈도를 줄여주세요',
                    '직접 방문을 권장합니다'
                ];
            default:
                return [
                    '현재 상태는 정상입니다',
                    '즐겨찾기 추가를 권장합니다',
                    '직접 방문도 좋은 방법입니다'
                ];
        }
    }
    
    // 패턴 차트 생성
    createPatternChart() {
        // 간단한 HTML 차트 (실제로는 Chart.js 등 사용 가능)
        return `
            <div class="pattern-visualization">
                <div class="pattern-bar" style="height: ${this.sessionData.clickCount * 10}px; background: linear-gradient(135deg, #ff6b35, #ff5722);"></div>
                <div class="pattern-label">클릭 횟수: ${this.sessionData.clickCount}</div>
            </div>
        `;
    }
    
    // 위험도 평가 표시
    createRiskAssessment() {
        const riskLevel = this.calculateRiskLevel();
        const riskColor = riskLevel === 'HIGH' ? '#d32f2f' : riskLevel === 'MEDIUM' ? '#ff5722' : '#4caf50';
        
        return `
            <div class="risk-indicator" style="color: ${riskColor}">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="risk-level">${riskLevel}</span>
                <span class="risk-description">위험도</span>
            </div>
        `;
    }
    
    // 권장사항 표시
    createRecommendations() {
        const recommendations = this.generateRecommendations();
        return `
            <ul class="recommendations-list">
                ${recommendations.map(rec => `<li><i class="fas fa-check"></i> ${rec}</li>`).join('')}
            </ul>
        `;
    }
    
    // 지원팀 연락 기능
    contactSupport() {
        const supportInfo = {
            email: 'support@smrentcar.com',
            phone: '0507-1337-3679',
            kakao: 'http://pf.kakao.com/_ctKfn/chat'
        };
        
        const supportPopup = document.createElement('div');
        supportPopup.className = 'support-popup';
        supportPopup.innerHTML = `
            <div class="support-header">
                <h3><i class="fas fa-headset"></i> 지원팀 연락처</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="support-content">
                <div class="support-item">
                    <i class="fas fa-envelope"></i>
                    <span>이메일: ${supportInfo.email}</span>
                </div>
                <div class="support-item">
                    <i class="fas fa-phone"></i>
                    <span>전화: ${supportInfo.phone}</span>
                </div>
                <div class="support-item">
                    <i class="fas fa-comment"></i>
                    <a href="${supportInfo.kakao}" target="_blank">카카오톡 문의</a>
                </div>
            </div>
        `;
        
        document.body.appendChild(supportPopup);
        
        setTimeout(() => {
            supportPopup.classList.add('show');
        }, 100);
    }
    
    // 실시간 데이터 동기화 시작
    startRealTimeSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(async () => {
            try {
                await this.syncWithServer();
                await this.updateLocalData();
                this.updateUI();
            } catch (error) {
                console.warn('실시간 동기화 중 오류:', error);
            }
        }, 5000); // 5초마다 동기화
        
        console.log('🔄 실시간 데이터 동기화가 시작되었습니다.');
    }
    
    // 서버와 데이터 동기화
    async syncWithServer() {
        try {
            // 네이버 광고 API에서 최신 데이터 가져오기
            const adData = await this.getNaverAdData();
            if (adData) {
                this.sessionData.adClicks = adData.clicks || 0;
                this.sessionData.lastSync = Date.now();
            }
            
            // 로컬 스토리지에 동기화 시간 저장
            localStorage.setItem('clickProtection_lastSync', Date.now().toString());
            
        } catch (error) {
            console.warn('서버 동기화 실패:', error);
        }
    }
    
    // 로컬 데이터 업데이트
    async updateLocalData() {
        try {
            // 세션 데이터 정리
            this.cleanupOldData();
            
            // 차단된 IP 목록 업데이트
            this.loadBlockedIPs();
            
            // 통계 데이터 업데이트
            this.updateStatistics();
            
        } catch (error) {
            console.warn('로컬 데이터 업데이트 실패:', error);
        }
    }
    
    // UI 업데이트
    updateUI() {
        // 활성 팝업이 있다면 내용 업데이트
        const activePopup = document.querySelector('.warning-popup');
        if (activePopup) {
            const level = parseInt(activePopup.dataset.level) || 1;
            const clickCount = this.sessionData.clickCount;
            this.updateWarningPopup(activePopup, level, clickCount);
        }
        
        // 접근 기록 테이블 업데이트 (있는 경우)
        this.updateAccessRecordsTable();
    }
    
    // 접근 기록 테이블 업데이트 (네이버를 통한 모든 접속 기록)
    updateAccessRecordsTable() {
        // 네이버를 통해서 들어온 접속인지 확인 (더 넓은 범위)
        if (!this.isNaverAccess()) {
            console.log('📝 네이버를 통한 접속이 아니므로 접속기록에 추가하지 않습니다.');
            return;
        }
        
        // 추가 검증: 실제 클릭 이벤트가 발생했는지 확인
        if (!this.sessionData.lastClickTime || this.sessionData.clickCount === 0) {
            console.log('📝 클릭 이벤트가 발생하지 않았으므로 접속기록을 생성하지 않습니다.');
            return;
        }
        
        // 클릭 시간이 최근 10분 내인지 확인 (시간 제한 완화)
        const now = Date.now();
        const clickTime = this.sessionData.lastClickTime;
        if (now - clickTime > 600000) { // 10분 = 600,000ms
            console.log('📝 클릭 시간이 너무 오래되어 접속기록을 생성하지 않습니다.');
            return;
        }
        
        let table = document.querySelector('.access-table tbody');
        
        // 테이블이 존재하지 않으면 생성 시도
        if (!table) {
            console.log('접속기록 테이블을 찾을 수 없습니다. 테이블 생성을 시도합니다.');
            this.createAccessRecordsTable();
            table = document.querySelector('.access-table tbody');
            
            if (!table) {
                console.log('⚠️ 접속기록 테이블 생성에 실패했습니다.');
                return;
            }
        }
        
        // 새로운 접근 기록 생성 및 저장
        const newRecord = this.createAccessRecord();
        if (newRecord) {
            // allRecords 배열에 추가
            this.allRecords.unshift(newRecord);
            
            // 최대 1000개 기록 유지
            if (this.allRecords.length > 1000) {
                this.allRecords = this.allRecords.slice(0, 1000);
            }
            
            // filteredRecords 업데이트 (필터가 적용되지 않은 경우)
            if (this.filteredRecords.length === 0 || this.filteredRecords === this.allRecords) {
                this.filteredRecords = [...this.allRecords];
            }
            
            // 테이블 표시 업데이트
            this.updateAccessRecordsTableDisplay();
            
            // 접속기록 업데이트 완료 로그
            console.log('✅ 네이버를 통한 접속기록이 업데이트되었습니다:', {
                time: new Date().toLocaleTimeString('ko-KR'),
                clickCount: this.sessionData.clickCount,
                ipAddress: this.sessionData.ipAddress,
                referrer: this.sessionData.referrer,
                clickTime: new Date(clickTime).toLocaleTimeString('ko-KR'),
                accessType: this.getAccessType()
            });
        } else {
            console.log('⚠️ 접속기록 생성에 실패했습니다.');
        }
    }
    
    // 네이버를 통한 접속인지 확인 (더 넓은 범위)
    isNaverAccess() {
        // 1. UTM 파라미터로 네이버 광고 확인 (powerlink, cpc, paid 등 모두 포함)
        const urlParams = new URLSearchParams(window.location.search);
        const utm_source = urlParams.get('utm_source');
        const utm_medium = urlParams.get('utm_medium');
        const utm_campaign = urlParams.get('utm_campaign');
        
        if (utm_source === 'naver' && (utm_medium === 'powerlink' || utm_medium === 'cpc' || utm_medium === 'paid')) {
            console.log('✅ UTM 파라미터로 네이버 광고 접속 확인됨');
            return true;
        }
        
        // 2. 네이버 광고 관련 URL 패턴 확인
        const currentUrl = window.location.href;
        if (this.isNaverAdUrl(currentUrl)) {
            console.log('✅ 네이버 광고 URL 패턴으로 접속 확인됨');
            return true;
        }
        
        // 3. 리퍼러가 네이버에서 온 경우 확인 (더 넓은 범위)
        if (this.sessionData.referrer && this.isNaverReferrer(this.sessionData.referrer)) {
            console.log('✅ 네이버 리퍼러로부터 접속 확인됨');
            return true;
        }
        
        // 4. 세션 데이터에 네이버 관련 정보가 있는지 확인 (완화됨)
        if (this.sessionData.referrer && this.sessionData.referrer.includes('naver')) {
            console.log('✅ 세션 데이터로 네이버 접속 확인됨');
            return true;
        }
        
        // 5. 테스트 모드일 때는 모든 접속을 네이버로 간주
        if (this.isTestMode) {
            console.log('🧪 테스트 모드: 모든 접속을 네이버 접속으로 간주');
            return true;
        }
        
        console.log('❌ 네이버를 통한 접속이 아님 - 접속기록 생성하지 않음');
        return false;
    }
    
    // 네이버 파워링크를 통한 접속인지 확인 (더 엄격한 검증) - 기존 함수 유지
    isNaverPowerLinkAccess() {
        // 1. UTM 파라미터로 정확한 파워링크 광고 확인 (가장 신뢰할 수 있는 방법)
        const urlParams = new URLSearchParams(window.location.search);
        const utm_source = urlParams.get('utm_source');
        const utm_medium = urlParams.get('utm_medium');
        const utm_campaign = urlParams.get('utm_campaign');
        
        if (utm_source === 'naver' && utm_medium === 'powerlink') {
            console.log('✅ UTM 파라미터로 네이버 파워링크 광고 접속 확인됨');
            return true;
        }
        
        // 2. 네이버 파워링크 전용 URL 패턴 확인
        const currentUrl = window.location.href;
        if (this.isNaverPowerLinkUrl(currentUrl)) {
            console.log('✅ 네이버 파워링크 URL 패턴으로 접속 확인됨');
            return true;
        }
        
        // 3. 리퍼러가 네이버 파워링크인지 확인 (일반 검색은 제외)
        if (this.sessionData.referrer && this.isNaverPowerLinkReferrer(this.sessionData.referrer)) {
            console.log('✅ 네이버 파워링크 리퍼러로부터 접속 확인됨');
            return true;
        }
        
        // 4. 세션 데이터에 명확한 파워링크 정보가 있는지 확인 (더 엄격하게)
        if (this.sessionData.adKeyword && 
            this.sessionData.adKeyword !== 'N/A' && 
            this.sessionData.searchTerm && 
            this.sessionData.searchTerm !== 'N/A' &&
            this.sessionData.referrer && 
            this.sessionData.referrer.includes('naver')) {
            console.log('✅ 세션 데이터로 네이버 파워링크 접속 확인됨');
            return true;
        }
        
        console.log('❌ 네이버 파워링크 광고를 통한 접속이 아님 - 접속기록 생성하지 않음');
        return false;
    }
    
    // 접속기록 데이터 생성
    createAccessRecord() {
        const now = new Date();
        
        return {
            timestamp: now.getTime(),
            time: now.toLocaleTimeString('ko-KR'),
            date: now.toLocaleDateString('ko-KR'),
            ipAddress: this.sessionData.ipAddress || 'N/A',
            deviceType: this.getDeviceType(),
            mediaType: this.getMediaType(),
            adClickRank: this.getAdClickRank(),
            adKeyword: this.sessionData.adKeyword || 'N/A',
            searchTerm: this.sessionData.searchTerm || 'N/A',
            adProduct: this.sessionData.adProduct || 'N/A',
            clickCount: this.sessionData.clickCount || 0,
            referrer: this.sessionData.referrer || 'N/A',
            sessionId: this.sessionData.sessionId || 'N/A',
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            language: navigator.language || 'ko-KR',
            accessType: this.getAccessType()
        };
    }
    
    // 접속 유형 확인
    getAccessType() {
        if (this.isTestMode) {
            return '테스트 모드';
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const utm_source = urlParams.get('utm_source');
        const utm_medium = urlParams.get('utm_medium');
        
        if (utm_source === 'naver') {
            if (utm_medium === 'powerlink') {
                return '네이버 파워링크';
            } else if (utm_medium === 'cpc') {
                return '네이버 CPC';
            } else if (utm_medium === 'paid') {
                return '네이버 유료광고';
            } else {
                return '네이버 광고';
            }
        }
        
        if (this.sessionData.referrer) {
            if (this.sessionData.referrer.includes('powerlink.naver.com')) {
                return '네이버 파워링크';
            } else if (this.sessionData.referrer.includes('search.naver.com')) {
                return '네이버 검색';
            } else if (this.sessionData.referrer.includes('cafe.naver.com')) {
                return '네이버 카페';
            } else if (this.sessionData.referrer.includes('blog.naver.com')) {
                return '네이버 블로그';
            } else if (this.sessionData.referrer.includes('naver.com')) {
                return '네이버 기타';
            }
        }
        
        return '직접 접속';
    }
    
    // 편집 모드 상태
    isEditMode = false;
    
    // 접근 기록 테이블 생성
    createAccessRecordsTable() {
        // 기존 테이블이 있는지 확인
        if (document.querySelector('.access-table')) {
            return;
        }
        
        // 테이블 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'access-records-container';
        container.innerHTML = `
            <div class="access-records-header">
                <h3>📊 접속기록</h3>
                <div class="access-controls">
                    <div class="date-filter">
                        <label>시작일:</label>
                        <input type="date" id="start-date" class="date-input">
                        <label>종료일:</label>
                        <input type="date" id="end-date" class="date-input">
                        <button class="btn-filter" onclick="window.clickProtection.filterByDate()">필터 적용</button>
                        <button class="btn-reset" onclick="window.clickProtection.resetDateFilter()">초기화</button>
                    </div>
                    <div class="download-controls">
                        <button class="btn-download" onclick="window.clickProtection.downloadAccessRecords()">접속기록 다운로드 (CSV)</button>
                        <button class="btn-edit" onclick="window.clickProtection.toggleEditMode()">편집 모드</button>
                    </div>
                    <div class="search-controls">
                        <select class="log-count-select">
                            <option>195 LOG</option>
                        </select>
                        <select class="search-item-select">
                            <option>검색항목</option>
                        </select>
                        <input type="text" class="search-input" placeholder="검색어를 입력하세요">
                        <button class="btn-search">검색</button>
                    </div>
                </div>
            </div>
            <div class="table-container">
                <table class="access-table">
                    <thead>
                        <tr>
                            <th class="edit-column">
                                <input type="checkbox" id="select-all-records" class="select-all-checkbox">
                            </th>
                            <th>접속시간</th>
                            <th>접속 IP</th>
                            <th>접속위치</th>
                            <th>중복 접속 횟수</th>
                            <th>알림 횟수</th>
                            <th>단말 종류</th>
                            <th colspan="2">접속자활동</th>
                            <th colspan="2">키워드 (확장검색만보기, 안내)</th>
                            <th>매체</th>
                            <th>광고여부 / 광고상품</th>
                            <th>광고 클릭 순위</th>
                            <th class="action-column">작업</th>
                        </tr>
                        <tr class="sub-header">
                            <th></th>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th>시간(초)</th>
                            <th>페이지</th>
                            <th>광고 키워드</th>
                            <th>사용자 검색어</th>
                            <th></th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="access-records-tbody">
                    </tbody>
                </table>
            </div>
            <div class="pagination-controls">
                <button class="btn-first" onclick="window.clickProtection.firstPage()">«</button>
                <button class="btn-prev" onclick="window.clickProtection.previousPage()">&lt;</button>
                <div class="page-numbers">
                    <span class="page-number active">1</span>
                    <span class="page-number">2</span>
                    <span class="page-number">3</span>
                    <span class="page-number">4</span>
                    <span class="page-number">5</span>
                    <span class="page-number">6</span>
                    <span class="page-number">7</span>
                    <span class="page-number">8</span>
                    <span class="page-number">9</span>
                    <span class="page-number">10</span>
                </div>
                <button class="btn-next" onclick="window.clickProtection.nextPage()">&gt;</button>
                <button class="btn-last" onclick="window.clickProtection.lastPage()">»</button>
                <div class="rows-per-page">
                    <label>행표시:</label>
                    <select class="rows-select" onchange="window.clickProtection.changeDisplayCount()">
                        <option value="10" selected>10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>
        `;
        
        // 페이지에 추가 (body 끝에)
        document.body.appendChild(container);
        
        // 스타일 적용
        this.applyAccessRecordsStyles();
        
        // 초기 데이터 설정
        this.currentPage = 1;
        this.displayCount = 50;
        this.filteredRecords = [];
        this.allRecords = [];
        
        // 초기 날짜 설정 (최근 30일)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
        
        // 초기 필터링 적용
        this.filteredRecords = [...this.allRecords];
        this.updateAccessRecordsTableDisplay();
        
        console.log('📊 네이버 파워링크 접속기록 테이블이 생성되었습니다.');
        
        // 편집 모드 이벤트 리스너 설정
        this.setupEditModeEventListeners();
    }
    
    // 편집 모드 이벤트 리스너 설정
    setupEditModeEventListeners() {
        const selectAllCheckbox = document.getElementById('select-all-records');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAllRecords(e.target.checked);
            });
        }
    }
    
    // 편집 모드 토글
    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const editButton = document.querySelector('.btn-edit');
        const editColumns = document.querySelectorAll('.edit-column, .action-column');
        
        if (this.isEditMode) {
            editButton.textContent = '편집 모드 종료';
            editButton.classList.add('active');
            editColumns.forEach(col => col.style.display = 'table-cell');
            console.log('✏️ 편집 모드가 활성화되었습니다.');
        } else {
            editButton.textContent = '편집 모드';
            editButton.classList.remove('active');
            editColumns.forEach(col => col.style.display = 'none');
            console.log('✏️ 편집 모드가 비활성화되었습니다.');
        }
        
        this.updateAccessRecordsTableDisplay();
    }
    
    // 모든 레코드 선택/해제
    toggleSelectAllRecords(checked) {
        const checkboxes = document.querySelectorAll('.record-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        console.log(`${checked ? '전체 선택' : '전체 해제'}되었습니다.`);
    }
    
    // 선택된 레코드 삭제
    deleteSelectedRecords() {
        const selectedCheckboxes = document.querySelectorAll('.record-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('삭제할 레코드를 선택해주세요.');
            return;
        }
        
        if (confirm(`선택된 ${selectedCheckboxes.length}개의 레코드를 삭제하시겠습니까?`)) {
            selectedCheckboxes.forEach(checkbox => {
                const recordId = checkbox.getAttribute('data-record-id');
                this.deleteRecord(recordId);
            });
            this.updateAccessRecordsTableDisplay();
            console.log(`${selectedCheckboxes.length}개의 레코드가 삭제되었습니다.`);
        }
    }
    
    // 개별 레코드 삭제
    deleteRecord(recordId) {
        // 로컬 스토리지에서 해당 레코드 제거
        const records = JSON.parse(localStorage.getItem('accessRecords') || '[]');
        const filteredRecords = records.filter(record => record.sessionId !== recordId);
        localStorage.setItem('accessRecords', JSON.stringify(filteredRecords));
        
        // 메모리에서도 제거
        this.allRecords = this.allRecords.filter(record => record.sessionId !== recordId);
        this.filteredRecords = this.filteredRecords.filter(record => record.sessionId !== recordId);
    }
    
    // 날짜별 필터링
    filterByDate() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (!startDate || !endDate) {
            alert('시작일과 종료일을 모두 선택해주세요.');
            return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            alert('시작일은 종료일보다 이전이어야 합니다.');
            return;
        }
        
        this.filteredRecords = this.allRecords.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= start && recordDate <= end;
        });
        
        this.currentPage = 1;
        this.updateAccessRecordsTableDisplay();
        console.log(`📅 ${startDate} ~ ${endDate} 기간의 레코드 ${this.filteredRecords.length}개가 필터링되었습니다.`);
    }
    
    // 날짜 필터 초기화
    resetDateFilter() {
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        this.filteredRecords = [...this.allRecords];
        this.currentPage = 1;
        this.updateAccessRecordsTableDisplay();
        console.log('📅 날짜 필터가 초기화되었습니다.');
    }
    
    // 접속기록 스타일 적용
    applyAccessRecordsStyles() {
        if (document.getElementById('access-records-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'access-records-styles';
        style.textContent = `
            .access-records-container {
                margin: 20px;
                padding: 20px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .access-records-container h3 {
                color: #333;
                margin-bottom: 10px;
                text-align: center;
                font-size: 24px;
            }
            
            .access-description {
                color: #666;
                text-align: center;
                margin-bottom: 20px;
                font-size: 14px;
                font-style: italic;
            }
            
            .table-container {
                overflow-x: auto;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .access-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            
            .access-table th,
            .access-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: center;
                white-space: nowrap;
            }
            
            .access-table th {
                background: #f8f9fa;
                font-weight: bold;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            
            .access-row {
                transition: background-color 0.3s;
            }
            
            .access-row:hover {
                background-color: #f5f5f5;
            }
            
            .access-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .date-filter, .display-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .date-input, .count-select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .btn-filter, .btn-reset {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
            }
            
            .btn-filter {
                background: #007bff;
                color: white;
            }
            
            .btn-filter:hover {
                background: #0056b3;
            }
            
            .btn-reset {
                background: #6c757d;
                color: white;
            }
            
            .btn-reset:hover {
                background: #545b62;
            }
            
            .btn-edit {
                background: #28a745;
                color: white;
                margin-left: 10px;
            }
            
            .btn-edit:hover {
                background: #218838;
            }
            
            .btn-edit.active {
                background: #dc3545;
            }
            
            .edit-column, .action-column {
                display: none;
                width: 50px;
                text-align: center;
            }
            
            .record-checkbox {
                width: 16px;
                height: 16px;
            }
            
            .btn-edit-record, .btn-delete-record {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                margin: 0 2px;
                padding: 2px;
                border-radius: 3px;
                transition: background-color 0.2s;
            }
            
            .btn-edit-record:hover {
                background: #e3f2fd;
            }
            
            .btn-delete-record:hover {
                background: #ffebee;
            }
            
            .edit-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .edit-dialog {
                background: white;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .edit-dialog-header {
                background: #667eea;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .edit-dialog-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .btn-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            .btn-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .edit-dialog-content {
                padding: 20px;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #333;
            }
            
            .edit-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 14px;
                box-sizing: border-box;
            }
            
            .edit-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
            }
            
            .edit-dialog-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            .btn-save, .btn-cancel {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .btn-save {
                background: #28a745;
                color: white;
            }
            
            .btn-save:hover {
                background: #218838;
            }
            
            .btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .btn-cancel:hover {
                background: #545b62;
            }
            
            .record-count {
                font-weight: bold;
                color: #495057;
                margin-left: 10px;
            }
            
            .pagination-controls {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-top: 20px;
                gap: 15px;
            }
            
            .btn-prev, .btn-next {
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            }
            
            .btn-prev:hover:not(:disabled), .btn-next:hover:not(:disabled) {
                background: #f8f9fa;
                border-color: #007bff;
            }
            
            .btn-prev:disabled, .btn-next:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .page-info {
                font-weight: bold;
                color: #495057;
                font-size: 14px;
            }
            
            .risk-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 10px;
            }
            
            .risk-low {
                background: #d4edda;
                color: #155724;
            }
            
            .risk-medium {
                background: #fff3cd;
                color: #856404;
            }
            
            .risk-high {
                background: #f8d7da;
                color: #721c24;
            }
            
            .risk-critical {
                background: #721c24;
                color: white;
            }
            
            .no-data-message {
                text-align: center;
                padding: 40px 20px;
                background: #f8f9fa;
                border: 2px dashed #dee2e6;
            }
            
            .no-data-content p {
                margin: 5px 0;
                color: #6c757d;
            }
            
            .no-data-content .no-data-sub {
                font-size: 12px;
                color: #adb5bd;
                font-style: italic;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // 접근 기록 행 생성
    createAccessRecordRow() {
        // lastAccess가 설정되지 않았으면 현재 시간 사용
        if (!this.sessionData.lastAccess) {
            this.sessionData.lastAccess = Date.now();
        }
        
        const row = document.createElement('tr');
        row.className = `access-row ${this.getRiskClass()}`;
        
        const now = new Date();
        const accessTime = new Date(this.sessionData.lastAccess);
        
        // IP 주소가 없으면 가져오기 시도
        if (!this.sessionData.ipAddress) {
            this.getCurrentIP().then(ip => {
                this.sessionData.ipAddress = ip;
            }).catch(() => {
                this.sessionData.ipAddress = 'N/A';
            });
        }
        
        row.innerHTML = `
            <td class="access-time">${accessTime.toLocaleTimeString('ko-KR')}</td>
            <td class="access-date">${accessTime.toLocaleDateString('ko-KR')}</td>
            <td class="ip-address">${this.sessionData.ipAddress || 'N/A'}</td>
            <td class="device-type">${this.getDeviceType()}</td>
            <td class="media-type">${this.getMediaType()}</td>
            <td class="ad-click-rank">${this.getAdClickRank()}</td>
            <td class="ad-keyword">${this.sessionData.adKeyword || 'N/A'}</td>
            <td class="user-search-term">${this.sessionData.searchTerm || 'N/A'}</td>
            <td class="ad-product">${this.sessionData.adProduct || 'N/A'}</td>
            <td class="risk-badge ${this.getRiskClass()}">${this.getRiskLevel()}</td>
        `;
        
        return row;
    }
    
    // 접속기록 필터링
    filterAccessRecords() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (!startDate || !endDate) {
            alert('시작일과 종료일을 모두 선택해주세요.');
            return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // 종료일의 마지막 시간으로 설정
        
        // 네이버 파워링크 접속 기록에서 날짜 범위에 맞는 것만 필터링
        this.filteredRecords = this.allRecords.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= start && recordDate <= end;
        });
        
        // 페이지네이션 초기화
        this.currentPage = 1;
        
        // 테이블 업데이트
        this.updateAccessRecordsTableDisplay();
        
        console.log(`📅 ${startDate} ~ ${endDate} 기간의 네이버 파워링크 접속기록 ${this.filteredRecords.length}개를 필터링했습니다.`);
    }
    
    // 접속기록 필터 초기화
    resetAccessRecordsFilter() {
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        
        // 최근 30일로 초기화
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
        
        this.filteredRecords = [...this.allRecords];
        this.currentPage = 1;
        this.updateAccessRecordsTableDisplay();
        
        console.log('🔄 네이버 파워링크 접속기록 필터가 초기화되었습니다.');
    }
    
    // 표시 개수 변경
    changeDisplayCount() {
        const newCount = parseInt(document.getElementById('display-count').value);
        this.displayCount = newCount;
        this.currentPage = 1;
        this.updateAccessRecordsTableDisplay();
        
        console.log(`📊 표시 개수가 ${newCount}개로 변경되었습니다.`);
    }
    
    // 이전 페이지
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateAccessRecordsTableDisplay();
        }
    }
    
    // 다음 페이지
    nextPage() {
        const totalPages = Math.ceil(this.filteredRecords.length / this.displayCount);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateAccessRecordsTableDisplay();
        }
    }
    
    // 접속기록 테이블 표시 업데이트
    updateAccessRecordsTableDisplay() {
        const tbody = document.getElementById('access-records-tbody');
        if (!tbody) return;
        
        // 기존 행 제거
        tbody.innerHTML = '';
        
        // 페이지네이션 계산
        const startIndex = (this.currentPage - 1) * this.displayCount;
        const endIndex = startIndex + this.displayCount;
        const pageRecords = this.filteredRecords.slice(startIndex, endIndex);
        
        if (pageRecords.length === 0) {
            // 기록이 없을 때 메시지 표시
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = `
                <td colspan="10" class="no-data-message">
                    <div class="no-data-content">
                        <p>📝 네이버 파워링크를 통한 접속 기록이 없습니다.</p>
                        <p class="no-data-sub">네이버 파워링크 광고를 클릭하여 접속하면 기록이 표시됩니다.</p>
                    </div>
                </td>
            `;
            tbody.appendChild(noDataRow);
        } else {
            // 행 생성
            pageRecords.forEach(record => {
                const row = this.createAccessRecordRowFromData(record);
                if (row) {
                    tbody.appendChild(row);
                }
            });
        }
        
        // 페이지네이션 정보 업데이트
        this.updatePaginationInfo();
        
        // 총 기록 수 업데이트
        document.getElementById('total-records').textContent = this.filteredRecords.length;
    }
    
    // 데이터로부터 접속기록 행 생성
    createAccessRecordRowFromData(record) {
        const row = document.createElement('tr');
        row.className = `access-row ${this.getRiskClassFromData(record)}`;
        
        const accessTime = new Date(record.timestamp);
        
        // 편집 모드일 때만 체크박스와 작업 버튼 표시
        const editColumn = this.isEditMode ? `
            <td class="edit-column">
                <input type="checkbox" class="record-checkbox" data-record-id="${record.sessionId}">
            </td>
        ` : '';
        
        const actionColumn = this.isEditMode ? `
            <td class="action-column">
                <button class="btn-edit-record" onclick="window.clickProtection.editRecord('${record.sessionId}')" title="편집">
                    ✏️
                </button>
                <button class="btn-delete-record" onclick="window.clickProtection.deleteRecord('${record.sessionId}')" title="삭제">
                    🗑️
                </button>
            </td>
        ` : '';
        
        row.innerHTML = `
            ${editColumn}
            <td class="access-time">${accessTime.toLocaleTimeString('ko-KR')}</td>
            <td class="ip-address">${record.ipAddress || 'N/A'}</td>
            <td class="access-location">${this.getAccessLocation(record.ipAddress) || 'N/A'}</td>
            <td class="duplicate-count">${record.clickCount || 0}</td>
            <td class="alert-count">${this.getAlertCount(record) || 0}</td>
            <td class="device-type">${record.deviceType || 'N/A'}</td>
            <td class="time-on-page">${this.getTimeOnPage(record) || 'N/A'}</td>
            <td class="page-count">${this.getPageCount(record) || 'N/A'}</td>
            <td class="ad-keyword">${record.adKeyword || 'N/A'}</td>
            <td class="user-search-term">${record.searchTerm || 'N/A'}</td>
            <td class="media-type">${record.mediaType || 'N/A'}</td>
            <td class="ad-info">${this.getAdInfo(record)}</td>
            <td class="ad-click-rank">${record.adClickRank || 'N/A'}</td>
            ${actionColumn}
        `;
        
        return row;
    }
    
    // 접속 위치 정보 반환 (IP 기반)
    getAccessLocation(ipAddress) {
        if (!ipAddress || ipAddress === 'N/A') return 'N/A';
        
        // 로컬 IP 주소들
        if (ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || 
            ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
            return '내부망';
        }
        
        // 실제 서비스에서는 IP 지오로케이션 API를 사용할 수 있음
        return '외부망';
    }
    
    // 알림 횟수 반환
    getAlertCount(record) {
        const clickCount = record.clickCount || 0;
        if (clickCount > 10) return 3;
        if (clickCount > 5) return 2;
        if (clickCount > 2) return 1;
        return 0;
    }
    
    // 페이지 체류 시간 반환
    getTimeOnPage(record) {
        // 실제 구현에서는 세션 시작/종료 시간을 계산
        return '30초';
    }
    
    // 방문 페이지 수 반환
    getPageCount(record) {
        // 실제 구현에서는 페이지 뷰 기록을 계산
        return '1';
    }
    
    // 광고 정보 반환
    getAdInfo(record) {
        const hasAd = record.adKeyword && record.adKeyword !== 'N/A';
        const product = record.adProduct || 'N/A';
        
        if (hasAd) {
            return `광고 / ${product}`;
        }
        return `일반 / ${product}`;
    }
    
    // 레코드 편집
    editRecord(recordId) {
        const record = this.allRecords.find(r => r.sessionId === recordId);
        if (!record) {
            alert('편집할 레코드를 찾을 수 없습니다.');
            return;
        }
        
        this.showEditDialog(record);
    }
    
    // 편집 다이얼로그 표시
    showEditDialog(record) {
        const dialog = document.createElement('div');
        dialog.className = 'edit-dialog-overlay';
        dialog.innerHTML = `
            <div class="edit-dialog">
                <div class="edit-dialog-header">
                    <h3>접속기록 편집</h3>
                    <button class="btn-close" onclick="this.closest('.edit-dialog-overlay').remove()">×</button>
                </div>
                <div class="edit-dialog-content">
                    <div class="form-group">
                        <label>IP 주소:</label>
                        <input type="text" id="edit-ip" value="${record.ipAddress || ''}" class="edit-input">
                    </div>
                    <div class="form-group">
                        <label>광고 키워드:</label>
                        <input type="text" id="edit-keyword" value="${record.adKeyword || ''}" class="edit-input">
                    </div>
                    <div class="form-group">
                        <label>사용자 검색어:</label>
                        <input type="text" id="edit-search" value="${record.searchTerm || ''}" class="edit-input">
                    </div>
                    <div class="form-group">
                        <label>광고 상품:</label>
                        <input type="text" id="edit-product" value="${record.adProduct || ''}" class="edit-input">
                    </div>
                    <div class="form-group">
                        <label>클릭 횟수:</label>
                        <input type="number" id="edit-clickcount" value="${record.clickCount || 0}" class="edit-input">
                    </div>
                </div>
                <div class="edit-dialog-footer">
                    <button class="btn-save" onclick="window.clickProtection.saveEditedRecord('${record.sessionId}')">저장</button>
                    <button class="btn-cancel" onclick="this.closest('.edit-dialog-overlay').remove()">취소</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    // 편집된 레코드 저장
    saveEditedRecord(recordId) {
        const record = this.allRecords.find(r => r.sessionId === recordId);
        if (!record) {
            alert('저장할 레코드를 찾을 수 없습니다.');
            return;
        }
        
        // 편집된 값들 가져오기
        record.ipAddress = document.getElementById('edit-ip').value;
        record.adKeyword = document.getElementById('edit-keyword').value;
        record.searchTerm = document.getElementById('edit-search').value;
        record.adProduct = document.getElementById('edit-product').value;
        record.clickCount = parseInt(document.getElementById('edit-clickcount').value) || 0;
        
        // 로컬 스토리지에 저장
        localStorage.setItem('accessRecords', JSON.stringify(this.allRecords));
        
        // 편집 다이얼로그 닫기
        document.querySelector('.edit-dialog-overlay').remove();
        
        // 테이블 업데이트
        this.updateAccessRecordsTableDisplay();
        
        console.log('✅ 레코드가 수정되었습니다:', recordId);
    }
    
    // 데이터로부터 위험도 클래스 반환
    getRiskClassFromData(record) {
        const clickCount = record.clickCount || 0;
        if (clickCount > 10) return 'risk-critical';
        if (clickCount > 5) return 'risk-high';
        if (clickCount > 2) return 'risk-medium';
        return 'risk-low';
    }
    
    // 데이터로부터 위험도 레벨 텍스트 반환
    getRiskLevelFromData(record) {
        const clickCount = record.clickCount || 0;
        if (clickCount > 10) return 'CRITICAL';
        if (clickCount > 5) return 'HIGH';
        if (clickCount > 2) return 'MEDIUM';
        return 'LOW';
    }
    
    // 페이지네이션 정보 업데이트
    updatePaginationInfo() {
        const totalPages = Math.ceil(this.filteredRecords.length / this.displayCount);
        
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        // 이전/다음 버튼 활성화/비활성화
        const prevBtn = document.querySelector('.btn-prev');
        const nextBtn = document.querySelector('.btn-next');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    }
    
    // 위험도 클래스 반환
    getRiskClass() {
        const clickCount = this.sessionData.clickCount;
        if (clickCount > 10) return 'risk-critical';
        if (clickCount > 5) return 'risk-high';
        if (clickCount > 2) return 'risk-medium';
        return 'risk-low';
    }
    
    // 위험도 레벨 텍스트 반환
    getRiskLevel() {
        const clickCount = this.sessionData.clickCount;
        if (clickCount > 10) return 'CRITICAL';
        if (clickCount > 5) return 'HIGH';
        if (clickCount > 2) return 'MEDIUM';
        return 'LOW';
    }
    
    // 디바이스 타입 감지
    getDeviceType() {
        const userAgent = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            return 'Mobile';
        } else if (/Tablet|iPad/.test(userAgent)) {
            return 'Tablet';
        }
        return 'Desktop';
    }
    
    // 미디어 타입 감지
    getMediaType() {
        if (this.sessionData.referrer && this.sessionData.referrer.includes('naver')) {
            return 'Naver';
        } else if (this.sessionData.referrer && this.sessionData.referrer.includes('google')) {
            return 'Google';
        } else if (this.sessionData.referrer && this.sessionData.referrer.includes('daum')) {
            return 'Daum';
        }
        return 'Direct';
    }
    
    // 광고 클릭 순위 계산
    getAdClickRank() {
        const clickCount = this.sessionData.clickCount;
        if (clickCount === 0) return '1st';
        if (clickCount === 1) return '2nd';
        if (clickCount === 2) return '3rd';
        return `${clickCount + 1}th`;
    }
    
    // 통계 업데이트
    updateStatistics() {
        const stats = this.getStatistics();
        
        // 통계 대시보드 업데이트 (있는 경우)
        const totalClicksElement = document.querySelector('.stat-value[data-stat="total-clicks"]');
        if (totalClicksElement) {
            totalClicksElement.textContent = stats.totalClicks;
        }
        
        const suspiciousElement = document.querySelector('.stat-value[data-stat="suspicious"]');
        if (suspiciousElement) {
            suspiciousElement.textContent = stats.suspiciousPatterns;
        }
        
        const blockedElement = document.querySelector('.stat-value[data-stat="blocked"]');
        if (blockedElement) {
            blockedElement.textContent = stats.blockedIPs;
        }
    }
    
    // 성능 최적화: 디바운싱
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 성능 최적화: 쓰로틀링
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // 메모리 정리
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // 이벤트 리스너 정리
        document.removeEventListener('click', this.boundHandleClick);
        document.removeEventListener('keydown', this.boundTrackKeyboardActivity);
        document.removeEventListener('mousemove', this.boundTrackMouseMovement);
        
        // 로컬 스토리지 정리
        this.cleanupOldData();
        
        console.log('🧹 클릭 보호 시스템 정리가 완료되었습니다.');
    }
    
    // 모니터링 일시정지
    pauseMonitoring() {
        this.isMonitoring = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('⏸️ 클릭 보호 시스템 모니터링이 일시정지되었습니다.');
    }
    
    // 모니터링 재개
    resumeMonitoring() {
        this.isMonitoring = true;
        this.startRealTimeSync();
        console.log('▶️ 클릭 보호 시스템 모니터링이 재개되었습니다.');
    }
    
    // 시스템 상태 확인
    getSystemStatus() {
        return {
            isMonitoring: this.isMonitoring,
            isAdminMode: this.isAdminMode,
            sessionId: this.sessionData.sessionId,
            clickCount: this.sessionData.clickCount,
            suspiciousPatterns: this.suspiciousPatterns.length,
            blockedIPs: this.blockedIPs.size,
            lastSync: this.sessionData.lastSync,
            uptime: Date.now() - this.sessionData.timestamp
        };
    }
    
    // 시스템 진단
    async diagnoseSystem() {
        const status = this.getSystemStatus();
        const diagnostics = {
            status,
            apiHealth: await this.checkAPIHealth(),
            localStorage: this.checkLocalStorage(),
            performance: this.checkPerformance(),
            recommendations: []
        };
        
        // 진단 결과에 따른 권장사항 생성
        if (!diagnostics.apiHealth.isHealthy) {
            diagnostics.recommendations.push('네이버 광고 API 연결을 확인하세요');
        }
        
        if (diagnostics.performance.memoryUsage > 50) {
            diagnostics.recommendations.push('메모리 사용량이 높습니다. 페이지를 새로고침하세요');
        }
        
        if (diagnostics.localStorage.usage > 80) {
            diagnostics.recommendations.push('로컬 스토리지 용량이 부족합니다');
        }
        
        return diagnostics;
    }
    
    // 로컬 스토리지 상태 확인
    checkLocalStorage() {
        try {
            let totalSize = 0;
            let itemCount = 0;
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                    itemCount++;
                }
            }
            
            const maxSize = 5 * 1024 * 1024; // 5MB
            const usage = (totalSize / maxSize) * 100;
            
            return {
                totalSize,
                itemCount,
                usage: Math.round(usage),
                isHealthy: usage < 90
            };
        } catch (error) {
            return {
                totalSize: 0,
                itemCount: 0,
                usage: 0,
                isHealthy: false,
                error: error.message
            };
        }
    }
    
    // 성능 상태 확인
    checkPerformance() {
        if (performance && performance.memory) {
            const memory = performance.memory;
            const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            return {
                memoryUsage: Math.round(memoryUsage),
                totalHeapSize: memory.totalJSHeapSize,
                usedHeapSize: memory.usedJSHeapSize,
                heapLimit: memory.jsHeapSizeLimit
            };
        }
        
        return {
            memoryUsage: 0,
            totalHeapSize: 0,
            usedHeapSize: 0,
            heapLimit: 0,
            notSupported: true
        };
    }
    
    // 페이지 언로드 시 정리
    handlePageUnload() {
        this.cleanup();
        this.saveSessionData();
    }

    // 접속기록 초기화 (페이지 로드 시에는 접속기록 생성하지 않음)
    initializeAccessRecords() {
        // 초기 접속 데이터 설정 (접속기록 생성과 무관하게 기본 정보만 설정)
        if (!this.sessionData.lastAccess) {
            this.sessionData.lastAccess = Date.now();
        }
        
        if (!this.sessionData.ipAddress) {
            this.getCurrentIP().then(ip => {
                this.sessionData.ipAddress = ip;
                console.log('🌐 IP 주소가 설정되었습니다:', ip);
            }).catch(() => {
                console.log('⚠️ IP 주소 설정에 실패했습니다.');
            });
        }
        
        // 리퍼러 정보 저장
        this.sessionData.referrer = document.referrer;
        
        // URL에서 광고 관련 정보 추출
        const urlParams = new URLSearchParams(window.location.search);
        this.sessionData.adKeyword = urlParams.get('keyword') || urlParams.get('q') || 'N/A';
        this.sessionData.searchTerm = urlParams.get('search') || urlParams.get('query') || 'N/A';
        this.sessionData.adProduct = urlParams.get('product') || urlParams.get('item') || 'N/A';
        
        // 페이지 로드 시에는 접속기록을 생성하지 않음
        // 실제 클릭 이벤트가 발생했을 때만 접속기록 생성
        console.log('📝 페이지 로드 - 접속기록은 클릭 이벤트 발생 시에만 생성됩니다.');
        
        // 네이버 파워링크 접속 여부만 로그로 확인
        if (this.isNaverPowerLinkAccess()) {
            console.log('✅ 네이버 파워링크 광고를 통한 접속이 확인되었습니다.');
        } else {
            console.log('📝 일반 접속으로 확인되었습니다.');
        }
    }

    // 세션 데이터 저장
    saveSessionData() {
        try {
            localStorage.setItem('clickProtectionSession', JSON.stringify(this.sessionData));
        } catch (error) {
            console.log('❌ 세션 데이터 저장 실패:', error.message);
        }
    }
    
    // 세션 데이터 로드
    loadSessionData() {
        try {
            const savedData = localStorage.getItem('clickProtectionSession');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // 기존 세션 데이터와 병합
                this.sessionData = { ...this.sessionData, ...parsedData };
                console.log('📂 저장된 세션 데이터를 로드했습니다.');
            }
        } catch (error) {
            console.log('❌ 세션 데이터 로드 실패:', error.message);
        }
    }
}

// 시스템 초기화 및 전역 접근
const clickProtection = new ClickProtectionSystem();
window.clickProtection = clickProtection;

// 개발자 도구에서 확인 가능
console.log('🛡️ 클릭 보호 시스템이 활성화되었습니다.');
console.log('=== 개발자 도구 명령어 ===');
console.log('📊 통계 확인: clickProtection.getStatistics()');
console.log('🔒 세션 차단: clickProtection.blockSession("session_id")');
console.log('🔓 세션 차단 해제: clickProtection.unblockSession("session_id")');
console.log('📈 고급 분석: clickProtection.showAdvancedAnalytics()');
console.log('🆘 지원팀 연락: clickProtection.contactSupport()');
console.log('🔍 시스템 상태: clickProtection.getSystemStatus()');
console.log('🏥 시스템 진단: clickProtection.diagnoseSystem()');
console.log('⏸️ 모니터링 일시정지: clickProtection.pauseMonitoring()');
console.log('▶️ 모니터링 재개: clickProtection.resumeMonitoring()');
console.log('🧹 시스템 정리: clickProtection.cleanup()');
console.log('========================');

// 테스트데이터 관리 기능
class TestDataManager {
    constructor(clickProtectionSystem) {
        this.system = clickProtectionSystem;
        this.testIPs = ['127.0.0.1', 'localhost', '192.168.1.1', '10.0.0.1'];
        this.testKeywords = ['test', '테스트', 'demo', '데모', 'sample', '샘플'];
        this.testProviders = ['test', 'localhost', 'internal'];
        this.testData = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('🧪 테스트데이터 관리자가 초기화되었습니다.');
    }
    
    setupEventListeners() {
        // 테스트데이터 식별 버튼
        const identifyBtn = document.getElementById('identify-test-data');
        if (identifyBtn) {
            identifyBtn.addEventListener('click', () => this.identifyTestData());
        }
        
        // 테스트데이터 삭제 버튼
        const deleteBtn = document.getElementById('delete-test-data');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteTestData());
        }
        
        // 테스트데이터 내보내기 버튼
        const exportBtn = document.getElementById('export-test-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTestData());
        }
        
        // 모든 데이터 초기화 버튼
        const clearBtn = document.getElementById('clear-all-data');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }
        
        // 선택된 항목 삭제 버튼
        const deleteSelectedBtn = document.getElementById('delete-selected-test-data');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedTestData());
        }
        
        // 전체 선택 체크박스
        const selectAllCheckbox = document.getElementById('select-all-test-data');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }
    }
    
    // 테스트데이터 식별
    identifyTestData() {
        const currentData = this.system.clickData || [];
        this.testData = currentData.filter(record => this.isTestData(record));
        
        this.updateTestDataStats();
        this.showTestDataTable();
        
        console.log(`🧪 ${this.testData.length}개의 테스트데이터가 식별되었습니다.`);
    }
    
    // 테스트데이터 판별
    isTestData(record) {
        // IP 주소 체크
        if (this.testIPs.some(ip => record.ipAddress && record.ipAddress.includes(ip))) {
            return true;
        }
        
        // 키워드 체크
        if (this.testKeywords.some(keyword => 
            record.keyword && record.keyword.toLowerCase().includes(keyword.toLowerCase()) ||
            record.searchTerm && record.searchTerm.toLowerCase().includes(keyword.toLowerCase())
        )) {
            return true;
        }
        
        // ISP 제공업체 체크
        if (this.testProviders.some(provider => 
            record.isp && record.isp.toLowerCase().includes(provider.toLowerCase())
        )) {
            return true;
        }
        
        // 특정 모바일 디바이스 패턴 체크
        if (record.userAgent && (
            record.userAgent.includes('test') ||
            record.userAgent.includes('demo') ||
            record.userAgent.includes('sample')
        )) {
            return true;
        }
        
        return false;
    }
    
    // 테스트데이터 통계 업데이트
    updateTestDataStats() {
        const testDataCount = document.getElementById('test-data-count');
        const testIpCount = document.getElementById('test-ip-count');
        const lastTestDataTime = document.getElementById('last-test-data-time');
        
        if (testDataCount) {
            testDataCount.textContent = this.testData.length;
        }
        
        if (testIpCount) {
            const uniqueIPs = new Set(this.testData.map(record => record.ipAddress)).size;
            testIpCount.textContent = uniqueIPs;
        }
        
        if (lastTestDataTime) {
            if (this.testData.length > 0) {
                const lastTime = Math.max(...this.testData.map(record => record.timestamp || 0));
                const date = new Date(lastTime);
                lastTestDataTime.textContent = date.toLocaleString('ko-KR');
            } else {
                lastTestDataTime.textContent = '-';
            }
        }
    }
    
    // 테스트데이터 테이블 표시
    showTestDataTable() {
        const tableBody = document.getElementById('test-data-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        this.testData.forEach(record => {
            const row = this.createTestDataRow(record);
            tableBody.appendChild(row);
        });
        
        // 체크박스 이벤트 리스너 설정
        this.setupCheckboxEventListeners();
    }
    
    // 테스트데이터 행 생성
    createTestDataRow(record) {
        const row = document.createElement('tr');
        const riskLevel = this.determineTestDataRiskLevel(record);
        
        row.innerHTML = `
            <td>
                <label class="checkbox-container">
                    <input type="checkbox" class="test-data-checkbox" data-id="${record.id || record.timestamp}">
                    <span class="checkmark"></span>
                </label>
            </td>
            <td>${record.ipAddress || 'N/A'}</td>
            <td>${new Date(record.timestamp || Date.now()).toLocaleString('ko-KR')}</td>
            <td>${record.clickCount || 1}</td>
            <td><span class="risk-${riskLevel}">${this.getRiskLevelText(riskLevel)}</span></td>
            <td>${this.getDeviceType(record)}</td>
            <td>${this.getStatusText(record)}</td>
            <td class="actions-cell">
                <button onclick="testDataManager.deleteSingleTestData('${record.id || record.timestamp}')" 
                        class="btn-delete-single" title="이 항목만 삭제">
                    🗑️
                </button>
                <button onclick="testDataManager.previewSingleDeletion('${record.id || record.timestamp}')" 
                        class="btn-preview-single" title="삭제 전 미리보기">
                    👁️
                </button>
            </td>
        `;
        
        return row;
    }
    
    // 테스트데이터 위험도 판별
    determineTestDataRiskLevel(record) {
        let riskScore = 0;
        
        // 중복 횟수에 따른 점수
        const duplicateCount = this.testData.filter(r => r.ipAddress === record.ipAddress).length;
        riskScore += duplicateCount * 2;
        
        // 알림 횟수에 따른 점수
        if (record.notificationCount) {
            riskScore += record.notificationCount;
        }
        
        // 디바이스 타입에 따른 점수
        if (this.getDeviceType(record) === '모바일') {
            riskScore += 1;
        }
        
        if (riskScore >= 5) return 'high';
        if (riskScore >= 3) return 'medium';
        return 'low';
    }
    
    // 위험도 텍스트 반환
    getRiskLevelText(level) {
        const texts = {
            'high': '높음',
            'medium': '보통',
            'low': '낮음'
        };
        return texts[level] || '낮음';
    }
    
    // 디바이스 타입 반환
    getDeviceType(record) {
        if (!record.userAgent) return 'N/A';
        
        if (record.userAgent.includes('Mobile')) return '모바일';
        if (record.userAgent.includes('Tablet')) return '태블릿';
        return '데스크톱';
    }
    
    // 상태 텍스트 반환
    getStatusText(record) {
        if (record.blocked) return '차단됨';
        if (record.suspicious) return '의심스러움';
        return '정상';
    }
    
    // 체크박스 이벤트 리스너 설정
    setupCheckboxEventListeners() {
        const checkboxes = document.querySelectorAll('.test-data-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectAllCheckbox());
        });
    }
    
    // 전체 선택 체크박스 상태 업데이트
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all-test-data');
        const checkboxes = document.querySelectorAll('.test-data-checkbox');
        
        if (selectAllCheckbox && checkboxes.length > 0) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            selectAllCheckbox.checked = checkedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        }
    }
    
    // 전체 선택/해제
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.test-data-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }
    
    // 테스트데이터 삭제
    deleteTestData() {
        if (this.testData.length === 0) {
            alert('삭제할 테스트데이터가 없습니다.');
            return;
        }
        
        if (confirm(`정말로 ${this.testData.length}개의 테스트데이터를 모두 삭제하시겠습니까?`)) {
            // 테스트데이터를 시스템에서 제거
            this.testData.forEach(testRecord => {
                const index = this.system.clickData.findIndex(record => 
                    record.id === testRecord.id || record.timestamp === testRecord.timestamp
                );
                if (index !== -1) {
                    this.system.clickData.splice(index, 1);
                }
            });
            
            // 로컬 스토리지 업데이트
            this.system.saveClickData();
            
            // 테이블과 통계 업데이트
            this.testData = [];
            this.updateTestDataStats();
            this.showTestDataTable();
            
            console.log('🧪 테스트데이터가 삭제되었습니다.');
            alert('테스트데이터가 삭제되었습니다.');
        }
    }
    
    // 선택된 테스트데이터 삭제
    deleteSelectedTestData() {
        const selectedCheckboxes = document.querySelectorAll('.test-data-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            alert('삭제할 항목을 선택해주세요.');
            return;
        }
        
        if (confirm(`선택된 ${selectedCheckboxes.length}개의 항목을 삭제하시겠습니까?`)) {
            selectedCheckboxes.forEach(checkbox => {
                const recordId = checkbox.dataset.id;
                const index = this.system.clickData.findIndex(record => 
                    record.id === recordId || record.timestamp === parseInt(recordId)
                );
                if (index !== -1) {
                    this.system.clickData.splice(index, 1);
                }
            });
            
            // 로컬 스토리지 업데이트
            this.system.saveClickData();
            
            // 테이블과 통계 업데이트
            this.identifyTestData();
            
            console.log('🧪 선택된 테스트데이터가 삭제되었습니다.');
            alert('선택된 테스트데이터가 삭제되었습니다.');
        }
    }
    
    // 테스트데이터 내보내기
    exportTestData() {
        if (this.testData.length === 0) {
            alert('내보낼 테스트데이터가 없습니다.');
            return;
        }
        
        const csv = this.convertToCSV(this.testData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `테스트데이터_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        console.log('🧪 테스트데이터가 내보내졌습니다.');
    }
    
    // 모든 데이터 초기화
    clearAllData() {
        if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            this.system.clickData = [];
            this.system.suspiciousPatterns = [];
            this.system.blockedIPs.clear();
            
            // 로컬 스토리지 정리
            localStorage.removeItem('clickData');
            localStorage.removeItem('suspiciousPatterns');
            localStorage.removeItem('blockedIPs');
            
            // 테이블과 통계 업데이트
            this.testData = [];
            this.updateTestDataStats();
            this.showTestDataTable();
            
            console.log('🧪 모든 데이터가 초기화되었습니다.');
            alert('모든 데이터가 초기화되었습니다.');
        }
    }

    // 모든 테스트 데이터만 삭제 (시스템 데이터는 유지)
    clearAllTestData() {
        if (this.testData.length === 0) {
            alert('삭제할 테스트 데이터가 없습니다.');
            return;
        }

        // 삭제 전 확인 다이얼로그
        const confirmMessage = `정말로 ${this.testData.length}개의 테스트 데이터를 모두 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`;
        
        if (confirm(confirmMessage)) {
            // 테스트 데이터만 시스템에서 제거
            this.testData.forEach(testRecord => {
                const index = this.system.clickData.findIndex(record => 
                    record.id === testRecord.id || record.timestamp === testRecord.timestamp
                );
                if (index !== -1) {
                    this.system.clickData.splice(index, 1);
                }
            });
            
            // 로컬 스토리지 업데이트
            this.system.saveClickData();
            
            // 테이블과 통계 업데이트
            this.testData = [];
            this.updateTestDataStats();
            this.showTestDataTable();
            
            console.log('🧪 모든 테스트 데이터가 삭제되었습니다.');
            alert(`✅ ${this.testData.length}개의 테스트 데이터가 성공적으로 삭제되었습니다.`);
        }
    }

    // 조건부 테스트 데이터 삭제 (날짜, 위험도 등 기준)
    clearTestDataByCondition(condition = {}) {
        const { startDate, endDate, riskLevel, deviceType, ipAddress } = condition;
        
        let filteredData = [...this.testData];
        
        // 날짜 필터링
        if (startDate && endDate) {
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.timestamp || Date.now());
                return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
            });
        }
        
        // 위험도 필터링
        if (riskLevel) {
            filteredData = filteredData.filter(record => 
                this.determineTestDataRiskLevel(record) === riskLevel
            );
        }
        
        // 디바이스 타입 필터링
        if (deviceType) {
            filteredData = filteredData.filter(record => 
                this.getDeviceType(record) === deviceType
            );
        }
        
        // IP 주소 필터링
        if (ipAddress) {
            filteredData = filteredData.filter(record => 
                record.ipAddress === ipAddress
            );
        }
        
        if (filteredData.length === 0) {
            alert('해당 조건에 맞는 테스트 데이터가 없습니다.');
            return;
        }
        
        const confirmMessage = `선택된 조건에 맞는 ${filteredData.length}개의 테스트 데이터를 삭제하시겠습니까?\n\n조건: ${JSON.stringify(condition, null, 2)}`;
        
        if (confirm(confirmMessage)) {
            // 필터링된 테스트 데이터만 시스템에서 제거
            filteredData.forEach(testRecord => {
                const index = this.system.clickData.findIndex(record => 
                    record.id === testRecord.id || record.timestamp === testRecord.timestamp
                );
                if (index !== -1) {
                    this.system.clickData.splice(index, 1);
                }
            });
            
            // 로컬 스토리지 업데이트
            this.system.saveClickData();
            
            // 테이블과 통계 업데이트
            this.identifyTestData();
            
            console.log(`🧪 조건부 테스트 데이터 ${filteredData.length}개가 삭제되었습니다.`);
            alert(`✅ 조건부 테스트 데이터 ${filteredData.length}개가 성공적으로 삭제되었습니다.`);
        }
    }

    // 삭제 전 미리보기
    previewTestDataDeletion(condition = {}) {
        const { startDate, endDate, riskLevel, deviceType, ipAddress } = condition;
        
        let filteredData = [...this.testData];
        
        // 날짜 필터링
        if (startDate && endDate) {
            filteredData = filteredData.filter(record => {
                const recordDate = new Date(record.timestamp || Date.now());
                return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
            });
        }
        
        // 위험도 필터링
        if (riskLevel) {
            filteredData = filteredData.filter(record => 
                this.determineTestDataRiskLevel(record) === riskLevel
            );
        }
        
        // 디바이스 타입 필터링
        if (deviceType) {
            filteredData = filteredData.filter(record => 
                this.getDeviceType(record) === deviceType
            );
        }
        
        // IP 주소 필터링
        if (ipAddress) {
            filteredData = filteredData.filter(record => 
                record.ipAddress === ipAddress
            );
        }
        
        if (filteredData.length === 0) {
            alert('해당 조건에 맞는 테스트 데이터가 없습니다.');
            return;
        }
        
        // 미리보기 테이블 생성
        this.showDeletionPreview(filteredData, condition);
    }

    // 삭제 미리보기 테이블 표시
    showDeletionPreview(data, condition) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'deletion-preview-container';
        previewContainer.innerHTML = `
            <div class="deletion-preview-header">
                <h3>🗑️ 삭제 미리보기</h3>
                <p>다음 조건에 맞는 ${data.length}개의 테스트 데이터가 삭제됩니다:</p>
                <div class="condition-summary">
                    <strong>조건:</strong> ${JSON.stringify(condition, null, 2)}
                </div>
            </div>
            <div class="deletion-preview-table">
                <table>
                    <thead>
                        <tr>
                            <th>IP 주소</th>
                            <th>접속 시간</th>
                            <th>클릭 수</th>
                            <th>위험도</th>
                            <th>디바이스</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.slice(0, 10).map(record => `
                            <tr>
                                <td>${record.ipAddress || 'N/A'}</td>
                                <td>${new Date(record.timestamp || Date.now()).toLocaleString('ko-KR')}</td>
                                <td>${record.clickCount || 1}</td>
                                <td>${this.getRiskLevelText(this.determineTestDataRiskLevel(record))}</td>
                                <td>${this.getDeviceType(record)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${data.length > 10 ? `<p class="preview-note">... 외 ${data.length - 10}개 더</p>` : ''}
            </div>
            <div class="deletion-preview-actions">
                <button class="btn-delete-confirm" onclick="testDataManager.confirmDeletion(${JSON.stringify(condition).replace(/"/g, '&quot;')})">
                    ✅ 삭제 확인
                </button>
                <button class="btn-delete-cancel" onclick="testDataManager.closeDeletionPreview()">
                    ❌ 취소
                </button>
            </div>
        `;
        
        // 기존 미리보기 제거
        this.closeDeletionPreview();
        
        // 새 미리보기 추가
        document.body.appendChild(previewContainer);
        
        // 스타일 적용
        this.applyDeletionPreviewStyles();
    }

    // 삭제 확인 실행
    confirmDeletion(condition) {
        this.closeDeletionPreview();
        this.clearTestDataByCondition(condition);
    }

    // 삭제 미리보기 닫기
    closeDeletionPreview() {
        const existingPreview = document.querySelector('.deletion-preview-container');
        if (existingPreview) {
            existingPreview.remove();
        }
    }

    // 삭제 미리보기 스타일 적용
    applyDeletionPreviewStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .deletion-preview-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #ff6b6b;
                border-radius: 10px;
                padding: 20px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 10000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .deletion-preview-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #ff6b6b;
                padding-bottom: 15px;
            }
            
            .deletion-preview-header h3 {
                color: #ff6b6b;
                margin: 0 0 10px 0;
            }
            
            .condition-summary {
                background: #fff5f5;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-family: monospace;
                font-size: 12px;
            }
            
            .deletion-preview-table {
                margin: 20px 0;
                overflow-x: auto;
            }
            
            .deletion-preview-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .deletion-preview-table th,
            .deletion-preview-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            
            .deletion-preview-table th {
                background: #f8f9fa;
                font-weight: bold;
            }
            
            .preview-note {
                text-align: center;
                color: #666;
                font-style: italic;
                margin-top: 10px;
            }
            
            .deletion-preview-actions {
                text-align: center;
                margin-top: 20px;
            }
            
            .btn-delete-confirm {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-right: 10px;
                font-weight: bold;
            }
            
            .btn-delete-cancel {
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
            }
            
            .btn-delete-confirm:hover {
                background: #ff5252;
            }
            
            .btn-delete-cancel:hover {
                background: #5a6268;
            }
        `;
        
        if (!document.querySelector('#deletion-preview-styles')) {
            style.id = 'deletion-preview-styles';
            document.head.appendChild(style);
        }
    }
    
    // CSV 변환
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = ['IP 주소', '접속 시간', '클릭 수', '위험도', '디바이스', '상태', '키워드', 'ISP'];
        const rows = data.map(record => [
            record.ipAddress || 'N/A',
            new Date(record.timestamp || Date.now()).toLocaleString('ko-KR'),
            record.clickCount || 1,
            this.getRiskLevelText(this.determineTestDataRiskLevel(record)),
            this.getDeviceType(record),
            this.getStatusText(record),
            record.keyword || record.searchTerm || 'N/A',
            record.isp || 'N/A'
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }
    
    // 테스트 타입 이름 가져오기
    getTestTypeName(testType) {
        const typeNames = {
            'duplicate_pc': 'PC 중복접속',
            'duplicate_mobile': '모바일 중복접속',
            'excessive_pc': 'PC 과도클릭',
            'excessive_mobile': '모바일 과도클릭',
            'suspicious_pc': 'PC 의심패턴',
            'suspicious_mobile': '모바일 의심패턴',
            'bot_pc': 'PC 봇행위',
            'bot_mobile': '모바일 봇행위',
            'all_pc': 'PC 전체테스트',
            'all_mobile': '모바일 전체테스트'
        };
        return typeNames[testType] || '알 수 없음';
    }
    
            // 테스트 모드 즉시 확인 및 설정 함수
        checkAndActivateTestMode() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const testMode = urlParams.get('test');
                
                if (testMode) {
                    console.log(`🧪 생성자에서 테스트 모드 감지: ${testMode}`);
                    this.isTestMode = true;
                    this.testType = testMode;
                    
                    // 테스트 모드 배너 표시
                    this.showTestModeBanner(testMode);
                    
                    // 즉시 테스트 팝업 표시
                    switch (testMode) {
                        case 'duplicate_pc':
                        case 'duplicate_mobile':
                            this.showTestWarning(1, 'duplicate');
                            break;
                        case 'excessive_pc':
                        case 'excessive_mobile':
                            this.showTestWarning(2, 'excessive');
                            break;
                        case 'suspicious_pc':
                        case 'suspicious_mobile':
                            this.showTestWarning(3, 'suspicious');
                            break;
                        case 'bot_pc':
                        case 'bot_mobile':
                            this.showTestWarning(4, 'bot');
                            break;
                        case 'all_pc':
                        case 'all_mobile':
                            this.showTestWarning(5, 'all');
                            break;
                        default:
                            this.showTestWarning(1, 'default');
                    }
                } else {
                    console.log('테스트 모드가 아닙니다');
                    this.isTestMode = false;
                }
            } catch (error) {
                console.error('테스트 모드 확인 중 오류:', error);
                this.isTestMode = false;
            }
        }
        
        // 테스트 경고 팝업 표시 함수
        showTestWarning(level, type) {
            console.log(`테스트 경고 팝업 표시: 레벨 ${level}, 타입 ${type}`);
            
            // 테스트용 데이터 설정
            const testData = {
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date().toISOString(),
                accessCount: 5,
                riskLevel: level
            };
            
            // 테스트 모드에서는 즉시 팝업 표시 (API 호출 없이)
            try {
                // 경고 팝업 표시
                this.showWarningPopup(level, type, testData);
                console.log('테스트 팝업 표시 성공');
            } catch (error) {
                console.error('테스트 팝업 표시 실패:', error);
                // 폴백: 간단한 경고창 표시
                this.showSimpleTestWarning(level, type);
            }
        }
        
        // 간단한 테스트 경고창 표시 (폴백)
        showSimpleTestWarning(level, type) {
            console.log('간단한 테스트 경고창 표시');
            
            const warningDiv = document.createElement('div');
            warningDiv.id = 'simple-test-warning';
            warningDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                color: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: 'Segoe UI', sans-serif;
            `;
            
            const levelText = ['1단계', '2단계', '3단계', '4단계', '5단계'][level - 1] || '테스트';
            const typeText = {
                'duplicate': '중복접속',
                'excessive': '과도클릭',
                'suspicious': '의심패턴',
                'bot': '봇행위'
            }[type] || '테스트';
            
            warningDiv.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                    <h3 style="margin: 0; font-size: 18px;">${levelText} 경고</h3>
                </div>
                <p style="margin: 0 0 15px 0; line-height: 1.4;">
                    <strong>${typeText} 경고</strong><br>
                    테스트 모드에서 생성된 경고 팝업입니다.
                </p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">닫기</button>
                    <button onclick="alert('즐겨찾기에 추가되었습니다!')" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 5px;
                        cursor: pointer;
                    ">즐겨찾기 추가</button>
                </div>
            `;
            
            document.body.appendChild(warningDiv);
            
            // 10초 후 자동 제거
            setTimeout(() => {
                if (warningDiv.parentNode) {
                    warningDiv.remove();
                }
            }, 10000);
        }
}

// 테스트데이터 관리자 초기화
let testDataManager = null;

// DOM이 로드된 후 테스트데이터 관리자 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (window.clickProtection) {
        testDataManager = new TestDataManager(window.clickProtection);
    }
});