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

// ─── TRACKING N8N + META PIXEL ───────────────────────────────────────────────

var _tracking = (function () {

    var N8N_ENDPOINT = 'https://projetopessoal-n8n.h574he.easypanel.host/webhook/track';
    var CHECKOUT_BASE = 'https://pay.wiapy.com/G8ZuOXn4ow';
    var OFFER_NAME    = 'Kit Professor Inclusivo TEA';
    var OFFER_VALUE   = 10;

    // 1. click_id persistente por visitante
    function getClickId() {
        var key = 'lp_click_id';
        var id  = localStorage.getItem(key);
        if (!id) {
            id = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem(key, id);
        }
        return id;
    }

    // 2. Captura UTMs e fbclid da URL
    function getUrlParams() {
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

    // 3. Lê cookies fbp e fbc
    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    // 4. Envia evento para o n8n (sem bloquear a página)
    function sendEvent(eventName, extraData) {
        var clickId = getClickId();
        var p = getUrlParams();
        var payload = Object.assign({
            event:        eventName,
            event_id:     eventName + '_' + clickId,
            click_id:     clickId,
            utm_source:   p.utm_source,
            utm_medium:   p.utm_medium,
            utm_campaign: p.utm_campaign,
            utm_content:  p.utm_content,
            utm_term:     p.utm_term,
            fbclid:       p.fbclid,
            fbp:          getCookie('_fbp'),
            fbc:          getCookie('_fbc'),
            offer_name:   OFFER_NAME,
            offer_value:  OFFER_VALUE,
            page_url:     window.location.href,
            user_agent:   navigator.userAgent
        }, extraData || {});

        try {
            // no-cors + credentials omit = sem preflight, sem bloqueio de CORS
            fetch(N8N_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify(payload),
                mode: 'no-cors',
                credentials: 'omit',
                keepalive: true
            }).catch(function(){});
        } catch (e) {}
    }

    // 5. Monta URL de checkout com UTMs + cid no utm_content
    function buildCheckoutUrl() {
        var clickId = getClickId();
        var p = getUrlParams();
        var url = new URL(CHECKOUT_BASE);

        // utm_content: original||cid:CLICK_ID (não duplica se já tiver cid:)
        var rawContent = p.utm_content;
        var cidTag = 'cid:' + clickId;
        var newContent;
        if (!rawContent) {
            newContent = cidTag;
        } else if (rawContent.indexOf('cid:') === -1) {
            newContent = rawContent + '||' + cidTag;
        } else {
            newContent = rawContent; // já tem cid, não duplica
        }

        if (p.utm_source)   url.searchParams.set('utm_source',   p.utm_source);
        if (p.utm_medium)   url.searchParams.set('utm_medium',   p.utm_medium);
        if (p.utm_campaign) url.searchParams.set('utm_campaign', p.utm_campaign);
                            url.searchParams.set('utm_content',  newContent);
        if (p.utm_term)     url.searchParams.set('utm_term',     p.utm_term);
        if (p.utm_id)       url.searchParams.set('utm_id',       p.utm_id);
        if (p.fbclid)       url.searchParams.set('fbclid',       p.fbclid);

        return url.toString();
    }

    // 6. Dispara page_view no carregamento
    function trackPageView() {
        sendEvent('page_view');
    }

    // 7. Intercepta todos os botões de checkout
    function setupCheckoutButtons() {
        var selectors = [
            '[data-cta="checkout"]',
            '[data-cta="premium-checkout"]',
            '[data-cta="start-checkout"]',
            'a[href*="pay.wiapy.com"]'
        ];
        var els = document.querySelectorAll(selectors.join(','));

        els.forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();

                // Pixel Meta
                if (typeof fbq === 'function') {
                    fbq('track', 'InitiateCheckout');
                }

                // n8n
                sendEvent('initiate_checkout');

                // Redireciona para checkout com UTMs
                var dest = buildCheckoutUrl();
                window.location.href = dest;
            });
        });
    }

    return { trackPageView: trackPageView, setupCheckoutButtons: setupCheckoutButtons };
})();

function setupPixelEvents() {
    _tracking.trackPageView();
    _tracking.setupCheckoutButtons();
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
