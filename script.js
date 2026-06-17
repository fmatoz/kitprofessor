// VSL Player - thumbnail via preload metadata, som ligado, pause/play no clique
function setupVSLPlayer() {
    const overlay   = document.getElementById('vsl-overlay');
    const loading   = document.getElementById('vsl-loading');
    const video     = document.getElementById('vsl-video');
    const flashIcon = document.getElementById('vsl-flash-icon');
    const flashI    = document.getElementById('vsl-flash-i');

    if (!overlay || !video) return;

    // Clique no overlay — inicia o vídeo com som
    overlay.addEventListener('click', function () {
        overlay.style.display = 'none';
        loading.style.display = 'flex';

        video.muted = false;
        video.currentTime = 0;

        const tryPlay = () => {
            loading.style.display = 'none';
            video.play().catch(() => {});
            // Adiciona o controle de pause/play ao clicar no vídeo
            video.addEventListener('click', togglePlayPause);
        };

        if (video.readyState >= 3) {
            tryPlay();
        } else {
            video.addEventListener('canplay', function onReady() {
                video.removeEventListener('canplay', onReady);
                tryPlay();
            });
            video.addEventListener('error', function () {
                loading.style.display = 'none';
            }, { once: true });
        }
    });

    // Flash icon ao pausar/retomar
    function showFlash(isPause) {
        if (!flashIcon) return;
        flashI.className = isPause ? 'fas fa-pause' : 'fas fa-play';
        flashIcon.classList.add('show');
        clearTimeout(flashIcon._timer);
        flashIcon._timer = setTimeout(() => flashIcon.classList.remove('show'), 600);
    }

    function togglePlayPause() {
        if (video.paused) {
            video.play();
            showFlash(false);
        } else {
            video.pause();
            showFlash(true);
        }
    }
}

// ─── TRACKING — click_id + n8n + Meta Pixel ──────────────────────────────────

// 1. click_id único por visitante (persiste no localStorage)
function getClickId() {
    var id = localStorage.getItem('click_id');
    if (!id) {
        id = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('click_id', id);
    }
    return id;
}

// 2. UTMs da URL
function getUtms() {
    var sp = new URLSearchParams(window.location.search);
    return {
        utm_source:   sp.get('utm_source')   || '',
        utm_medium:   sp.get('utm_medium')   || '',
        utm_campaign: sp.get('utm_campaign') || '',
        utm_content:  sp.get('utm_content')  || '',
        utm_term:     sp.get('utm_term')     || '',
        utm_id:       sp.get('utm_id')       || '',
        fbclid:       sp.get('fbclid')       || ''
    };
}

// 3. Lê cookie pelo nome
function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
}

// 4. Envia evento para o n8n
function sendTrack(eventName) {
    var clickId = getClickId();
    var utms    = getUtms();
    var payload = {
        event:        eventName,
        event_id:     eventName + '_' + clickId,
        click_id:     clickId,
        utm_source:   utms.utm_source,
        utm_medium:   utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content:  utms.utm_content,
        utm_term:     utms.utm_term,
        fbclid:       utms.fbclid,
        fbp:          getCookie('_fbp'),
        fbc:          getCookie('_fbc'),
        offer_name:   'Kit Professor Inclusivo TEA',
        offer_value:  19.90,
        page_url:     window.location.href,
        user_agent:   navigator.userAgent
    };
    try {
        fetch('https://projetopessoal-n8n.h574he.easypanel.host/webhook/track', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        }).catch(function() {});
    } catch (e) {}
}

// 5. Monta URL do checkout com UTMs + cid dentro do utm_content
function buildCheckoutUrl() {
    var clickId = getClickId();
    var utms    = getUtms();
    var url     = new URL('https://pay.wiapy.com/G8ZuOXn4ow');

    // Remove cid antigo se vier na URL, para não duplicar
    var raw = utms.utm_content.replace(/\|\|cid:[^\|]*/g, '').replace(/^cid:[^\|]*/g, '');
    var newContent = raw ? raw + '||cid:' + clickId : 'cid:' + clickId;

    if (utms.utm_source)   url.searchParams.set('utm_source',   utms.utm_source);
    if (utms.utm_medium)   url.searchParams.set('utm_medium',   utms.utm_medium);
    if (utms.utm_campaign) url.searchParams.set('utm_campaign', utms.utm_campaign);
                           url.searchParams.set('utm_content',  newContent);
    if (utms.utm_term)     url.searchParams.set('utm_term',     utms.utm_term);
    if (utms.utm_id)       url.searchParams.set('utm_id',       utms.utm_id);
    if (utms.fbclid)       url.searchParams.set('fbclid',       utms.fbclid);

    return url.toString();
}

// 6. Configura eventos de pixel + n8n + checkout
function setupPixelEvents() {
    // page_view: Pixel Meta + n8n
    if (typeof fbq === 'function') fbq('track', 'PageView');
    sendTrack('page_view');

    // Botões de checkout
    var selectors = [
        '[data-cta="checkout"]',
        '[data-cta="premium-checkout"]',
        '[data-cta="start-checkout"]',
        'a[href*="pay.wiapy.com"]',
        '.plan-button',
        '.premium-button'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            sendTrack('initiate_checkout');
            if (typeof fbq === 'function') fbq('track', 'InitiateCheckout');
            window.location.href = buildCheckoutUrl();
        });
    });
}

function scrollToPlans() {
    document.getElementById('plans').scrollIntoView({
        behavior: 'smooth'
    });
}

function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    if (!isActive) {
        faqItem.classList.add('active');
    }
}

function startPlansCountdown() {
    const initialTime = (1 * 60 * 60) + (35 * 60) + 33;
    const now = new Date().getTime();
    const countdownTime = now + (initialTime * 1000);

    const timer = setInterval(function() {
        const now = new Date().getTime();
        const distance = countdownTime - now;

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const plansHours = document.getElementById('plans-hours');
        const plansMinutes = document.getElementById('plans-minutes');
        const plansSeconds = document.getElementById('plans-seconds');

        if (plansHours && plansMinutes && plansSeconds) {
            plansHours.textContent = hours.toString().padStart(2, '0');
            plansMinutes.textContent = minutes.toString().padStart(2, '0');
            plansSeconds.textContent = seconds.toString().padStart(2, '0');
        }

        if (distance < 0) {
            clearInterval(timer);
            if (plansHours && plansMinutes && plansSeconds) {
                plansHours.textContent = '00';
                plansMinutes.textContent = '00';
                plansSeconds.textContent = '00';
            }
        }
    }, 1000);
}

function animateOnScroll() {
    const elements = document.querySelectorAll('.benefit-card, .exclusive-card, .bonus-card, .testimonial-card, .plan-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-scroll', 'visible');
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(element => {
        element.classList.add('animate-on-scroll');
        observer.observe(element);
    });
}

function addRippleAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

function setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

function addCardHoverEffects() {
    const cards = document.querySelectorAll('.benefit-card, .exclusive-card, .bonus-card, .testimonial-card, .plan-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
            this.style.boxShadow = '0 15px 35px rgba(0,0,0,0.2)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
        });
    });
}

function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

function setCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        dateElement.textContent = `${day}/${month}/${year}`;
    }
}

function trackEvents() {
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
        }
    });

    const ctaButtons = document.querySelectorAll('.cta-button');
    ctaButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            localStorage.setItem('lastCtaClicked', index);
        });
    });
}

function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
        return;
    }

    setCurrentDate();
    setupPixelEvents();
    setupVSLPlayer();
    animateOnScroll();
    addRippleAnimation();
    setupSmoothScroll();
    addCardHoverEffects();
    setupLazyLoading();

    document.body.classList.add('loaded');
    trackEvents();
}

const notificationMessages = [
    { name: 'Juliana P.', product: 'Kit Professor Inclusivo TEA', location: 'Belo Horizonte, MG', time: 'há 2 minutos' },
    { name: 'Carla S.', product: 'Kit Professor Inclusivo TEA', location: 'São Paulo, SP', time: 'há 5 minutos' },
    { name: 'Ana C.', product: 'Kit Professor Inclusivo TEA', location: 'Salvador, BA', time: 'há 8 minutos' },
    { name: 'Patrícia L.', product: 'Kit Professor Inclusivo TEA', location: 'Brasília, DF', time: 'há 12 minutos' },
    { name: 'Fernanda M.', product: 'Kit Professor Inclusivo TEA', location: 'Rio de Janeiro, RJ', time: 'há 15 minutos' }
];

let notificationIndex = 0;

function createNotification(notification) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notificationEl = document.createElement('div');
    notificationEl.className = 'notification';

    notificationEl.innerHTML = `
        <div class="notification-icon">✓</div>
        <div class="notification-content">
            <div class="notification-name">${notification.name}</div>
            <div class="notification-product">Comprou: ${notification.product}</div>
            <div class="notification-location">${notification.location} - ${notification.time}</div>
        </div>
    `;

    container.appendChild(notificationEl);

    setTimeout(() => {
        notificationEl.remove();
    }, 5000);
}

function startNotificationSystem() {
    setTimeout(() => {
        createNotification(notificationMessages[notificationIndex]);
        notificationIndex = (notificationIndex + 1) % notificationMessages.length;
    }, 2000);

    setInterval(() => {
        createNotification(notificationMessages[notificationIndex]);
        notificationIndex = (notificationIndex + 1) % notificationMessages.length;
    }, Math.random() * 7000 + 8000);
}

initializeApp();
startPlansCountdown();
startNotificationSystem();
