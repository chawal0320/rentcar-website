// 모바일 메뉴 토글
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }

    // 차량 필터 기능
    const filterButtons = document.querySelectorAll('.filter-btn');
    const vehicleCards = document.querySelectorAll('.vehicle-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 활성 버튼 클래스 제거
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼 활성화
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');

            vehicleCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-type') === filter) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeIn 0.5s ease-in';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 예약 버튼 클릭 이벤트
    const reserveButtons = document.querySelectorAll('.reserve-button');
    reserveButtons.forEach(button => {
        button.addEventListener('click', function() {
            alert('예약 기능은 카카오톡으로 문의해주세요!');
        });
    });
});

// 스크롤 시 헤더 스타일 변경
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// 부드러운 스크롤
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 애니메이션 효과
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

// 애니메이션 대상 요소들
const animateElements = document.querySelectorAll('.step, .feature, .contact-item');
animateElements.forEach(el => {
    observer.observe(el);
});

// 페이지 로드 애니메이션
window.addEventListener('load', function() {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.classList.add('fade-in');
    }
    
    const processSteps = document.querySelectorAll('.step');
    processSteps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('slide-in');
        }, index * 200);
    });

    // 인기차량 캐러셀 기능
    const carouselTrack = document.querySelector('.carousel-track');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (carouselTrack) {
        let isPaused = false;
        
        // 마우스 호버 시 애니메이션 일시정지
        carouselTrack.addEventListener('mouseenter', () => {
            isPaused = true;
            carouselTrack.style.animationPlayState = 'paused';
        });
        
        carouselTrack.addEventListener('mouseleave', () => {
            isPaused = false;
            carouselTrack.style.animationPlayState = 'running';
        });
        
        // 이전/다음 버튼 클릭 이벤트
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                if (!isPaused) {
                    carouselTrack.style.animationPlayState = 'paused';
                    setTimeout(() => {
                        carouselTrack.style.animationPlayState = 'running';
                    }, 100);
                }
            });
            
            nextBtn.addEventListener('click', () => {
                if (!isPaused) {
                    carouselTrack.style.animationPlayState = 'paused';
                    setTimeout(() => {
                        carouselTrack.style.animationPlayState = 'running';
                    }, 100);
                }
            });
        }
        
        // 터치 이벤트 지원 (모바일)
        let startX = 0;
        let currentX = 0;
        
        carouselTrack.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            carouselTrack.style.animationPlayState = 'paused';
        });
        
        carouselTrack.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
        });
        
        carouselTrack.addEventListener('touchend', () => {
            const diff = startX - currentX;
            if (Math.abs(diff) > 50) {
                // 스와이프 감지
                setTimeout(() => {
                    carouselTrack.style.animationPlayState = 'running';
                }, 500);
            } else {
                carouselTrack.style.animationPlayState = 'running';
            }
        });
    }
});

// 카카오톡 아이콘 호버 효과
const kakaoInquiry = document.querySelector('.kakao-inquiry');
if (kakaoInquiry) {
    kakaoInquiry.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
    });
    
    kakaoInquiry.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
}

// 검색 폼 제출 이벤트 (vehicles.html 페이지용)
const searchForm = document.querySelector('.search-form');
if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const pickupDate = document.getElementById('pickup-date').value;
        const returnDate = document.getElementById('return-date').value;
        const location = document.getElementById('location').value;
        const vehicleType = document.getElementById('vehicle-type').value;
        
        if (!pickupDate || !returnDate || !location) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }
        
        if (new Date(pickupDate) >= new Date(returnDate)) {
            alert('반납일은 수령일보다 늦어야 합니다.');
            return;
        }
        
        // 검색 결과 시뮬레이션
        showLoadingSpinner();
        setTimeout(() => {
            hideLoadingSpinner();
            alert('검색이 완료되었습니다. 아래 차량 목록을 확인해주세요.');
        }, 2000);
    });
}

// 날짜 입력 필드 최소값 설정
const today = new Date().toISOString().split('T')[0];
const dateInputs = document.querySelectorAll('input[type="date"]');
dateInputs.forEach(input => {
    input.min = today;
});

// 차량 카테고리 필터링 (선택사항)
const categoryButtons = document.querySelectorAll('.category-filter');
categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        
        // 모든 버튼에서 active 클래스 제거
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        // 클릭된 버튼에 active 클래스 추가
        this.classList.add('active');
        
        // 차량 카드 필터링 (실제 구현에서는 서버 요청)
        filterVehicles(category);
    });
});

// 차량 필터링 함수
function filterVehicles(category) {
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    
    vehicleCards.forEach(card => {
        const vehicleType = card.getAttribute('data-type');
        
        if (category === 'all' || vehicleType === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 로딩 스피너 표시
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-content">
            <div class="spinner"></div>
            <p>검색 중...</p>
        </div>
    `;
    document.body.appendChild(spinner);
}

// 로딩 스피너 숨김
function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// CSS 애니메이션 클래스 추가
const style = document.createElement('style');
style.textContent = `
    .fade-in {
        animation: fadeIn 1s ease-in;
    }
    
    .slide-in {
        animation: slideIn 0.8s ease-out;
    }
    
    .animate {
        animation: fadeInUp 0.8s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(30px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .loading-spinner {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .spinner-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .header.scrolled {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
    }
    
    .nav.active {
        display: block;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        padding: 1rem;
    }
    
    .nav.active .nav-list {
        flex-direction: column;
        gap: 1rem;
    }
`;
document.head.appendChild(style); 