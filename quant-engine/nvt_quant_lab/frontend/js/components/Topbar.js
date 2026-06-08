import { Auth } from '../auth.js';
import { AppState } from '../state.js';
import { t } from '../i18n.js';

const PAGE_TITLES = {
    '/':             'topbar_welcome',
    '/login':        'topbar_login',
    '/register':     'topbar_register',
    '/dashboard':    'nav_dashboard',
    '/portfolio':    'nav_portfolio',
    '/risk-analysis':'nav_risk',
    '/revenue':      'nav_revenue',
    '/ai-assistant': 'nav_ai',
    '/reports':      'nav_reports',
    '/financials':   'nav_financials',
};

export function renderTopbar() {
    const isAuth = Auth.isAuthenticated();
    const path   = window.location.hash.replace('#', '') || '/';
    const titleKey = PAGE_TITLES[path] || 'NVT Quant Lab';
    const title = t(titleKey);
    const currentLang = AppState.currentLang || 'vi';

    const html = `
        <header class="topbar" id="main-topbar">
            <div class="topbar-left">
                <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Toggle sidebar">
                    <span></span><span></span><span></span>
                </button>
                <div class="topbar-breadcrumb">
                    <span class="breadcrumb-app">NVT Quant Lab</span>
                    <span class="breadcrumb-sep">›</span>
                    <span class="breadcrumb-page" id="topbar-page-title">${title}</span>
                </div>
            </div>
            <div class="topbar-right">
                <div class="lang-selector-group">
                    <button class="lang-btn ${currentLang === 'vi' ? 'active' : ''}" data-lang="vi">VI</button>
                    <span class="lang-sep">|</span>
                    <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                </div>
                <div class="topbar-time" id="topbar-time">--:--</div>
                ${isAuth ? `
                <a href="#/risk-analysis" class="topbar-cta-btn">
                    ${t('topbar_cta')}
                </a>` : ''}
            </div>
        </header>
    `;


    const container = document.getElementById('topbar-container');
    if (container) container.innerHTML = html;

    // Live clock
    const tick = () => {
        const el = document.getElementById('topbar-time');
        if (el) el.textContent = new Date().toLocaleTimeString('vi-VN');
    };
    tick();
    const interval = setInterval(tick, 1000);

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar   = document.getElementById('main-sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Language selector logic
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newLang = btn.getAttribute('data-lang');
            if (newLang !== AppState.currentLang) {
                AppState.setLang(newLang);
                // The global listener in app.js will handle re-rendering or we can just re-render layout
            }
        });
    });

    return { cleanup: () => clearInterval(interval) };
}

