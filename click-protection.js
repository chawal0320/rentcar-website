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
            type,
            data,
            timestamp: Date.now(),
            sessionId: this.sessionData.sessionId,
            url: window.location.href
        };

        this.suspiciousPatterns.push(suspiciousActivity);
        
        // 로그 출력
        console.warn('🚨 의심스러운 활동 감지:', suspiciousActivity);
        
        // 서버로 전송
        this.reportSuspiciousActivity(suspiciousActivity);
        
        // 로컬에 저장
        this.saveSuspiciousActivity(suspiciousActivity);
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
        this.blockedIPs.delete(sessionId);
        try {
            localStorage.setItem('blockedIPs', JSON.stringify([...this.blockedIPs]));
        } catch (e) {
            console.warn('차단 해제 저장 실패:', e);
        }
    }
}

// 시스템 초기화
const clickProtection = new ClickProtectionSystem();

// 전역에서 접근 가능하도록 설정
window.clickProtection = clickProtection;

// 개발자 도구에서 확인 가능
console.log('🛡️ 클릭 보호 시스템이 활성화되었습니다.');
console.log('통계 확인: clickProtection.getStatistics()');
console.log('세션 차단: clickProtection.blockSession("session_id")');
console.log('세션 차단 해제: clickProtection.unblockSession("session_id")');
