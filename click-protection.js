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

        // 단계별 경고 팝업 표시
        this.showWarningPopup();

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
                </div>
            `;
            
            document.body.appendChild(popup);
            
            // 5초 후 자동으로 닫기
            setTimeout(() => {
                this.closeWarningPopup();
            }, 5000);
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
                max-width: 350px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideInLeft 0.3s ease-out;
                border: 2px solid;
            }
            
            .warning-level-1 {
                border-color: #ffc107;
                background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            }
            
            .warning-level-2 {
                border-color: #fd7e14;
                background: linear-gradient(135deg, #ffe8d6, #ffd8a8);
            }
            
            .warning-level-3 {
                border-color: #dc3545;
                background: linear-gradient(135deg, #f8d7da, #f5c6cb);
            }
            
            .warning-header {
                display: flex;
                align-items: center;
                padding: 15px 20px 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .warning-icon {
                font-size: 24px;
                margin-right: 12px;
            }
            
            .warning-title {
                font-weight: 600;
                font-size: 16px;
                color: #2c3e50;
                flex: 1;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 20px;
                color: #6c757d;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            }
            
            .close-btn:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #495057;
            }
            
            .warning-content {
                padding: 15px 20px 20px;
            }
            
            .warning-content p {
                margin: 0 0 15px 0;
                color: #495057;
                line-height: 1.5;
                font-size: 14px;
            }
            
            .warning-actions {
                display: flex;
                gap: 10px;
            }
            
            .favorites-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                flex: 1;
            }
            
            .favorites-btn:hover {
                background: #0056b3;
                transform: translateY(-1px);
            }
            
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
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
                    padding: 12px 15px 8px;
                }
                
                .warning-content {
                    padding: 12px 15px 15px;
                }
                
                .warning-title {
                    font-size: 15px;
                }
                
                .warning-content p {
                    font-size: 13px;
                }
                
                .favorites-btn {
                    padding: 10px 16px;
                    font-size: 14px;
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
                    padding: 10px 12px 6px;
                }
                
                .warning-content {
                    padding: 10px 12px 12px;
                }
                
                .warning-icon {
                    font-size: 20px;
                    margin-right: 8px;
                }
                
                .warning-title {
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
}

// 시스템 초기화 및 전역 접근
const clickProtection = new ClickProtectionSystem();
window.clickProtection = clickProtection;

// 개발자 도구에서 확인 가능
console.log('🛡️ 클릭 보호 시스템이 활성화되었습니다.');
console.log('통계 확인: clickProtection.getStatistics()');
console.log('세션 차단: clickProtection.blockSession("session_id")');
console.log('세션 차단 해제: clickProtection.unblockSession("session_id")');
