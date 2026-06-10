import { Auth } from '../auth.js';
import { t } from '../i18n.js';

export function renderSidebar(router) {
    const isAuth = Auth.isAuthenticated();
    const user   = Auth.getUser();
    const path   = window.location.hash.replace('#', '') || '/';

    const navClass = (p) => `nav-link ${path === p ? 'active' : ''}`;

    const publicNav = `
        <a href="#/login"    class="${navClass('/login')}"   id="nav-login">
            <span class="nav-icon">🔑</span> ${t('topbar_login')}
        </a>
        <a href="#/register" class="${navClass('/register')}" id="nav-register">
            <span class="nav-icon">✨</span> ${t('topbar_register')}
        </a>
    `;

    const privateNav = `
        <a href="#/dashboard"    class="${navClass('/dashboard')}"    id="nav-dashboard">
            <span class="nav-icon">📊</span> ${t('nav_dashboard')}
        </a>
        <a href="#/portfolio"    class="${navClass('/portfolio')}"    id="nav-portfolio">
            <span class="nav-icon">💼</span> ${t('nav_portfolio')}
        </a>
        <a href="#/risk-analysis" class="${navClass('/risk-analysis')}" id="nav-risk">
            <span class="nav-icon">🔬</span> ${t('nav_risk')}
        </a>
        <a href="#/revenue"      class="${navClass('/revenue')}"      id="nav-revenue">
            <span class="nav-icon">📈</span> ${t('nav_revenue')}
        </a>
        <a href="#/optimization" class="${navClass('/optimization')}" id="nav-optimization">
            <span class="nav-icon">⚖️</span> ${t('nav_opt_adv')}
        </a>
        <a href="#/quant"        class="${navClass('/quant')}"        id="nav-quant">
            <span class="nav-icon">📈</span> ${t('nav_quant')}
        </a>
        <a href="#/quant/backtest" class="${navClass('/quant/backtest')}" id="nav-backtest">
            <span class="nav-icon">⏱️</span> ${t('nav_backtest')}
        </a>
        <a href="#/quant/optimizer" class="${navClass('/quant/optimizer')}" id="nav-optimizer-advanced">
            <span class="nav-icon">⚖️</span> ${t('nav_optimizer_advanced')}
        </a>
        <a href="#/ai-assistant" class="${navClass('/ai-assistant')}" id="nav-ai">
            <span class="nav-icon">🤖</span> ${t('nav_ai')}
        </a>
        <a href="#/ai-analyst" class="${navClass('/ai-analyst')}" id="nav-ai-analyst">
            <span class="nav-icon">✦</span> ${t('nav_ai_analyst')}
        </a>
        <a href="#/reports"      class="${navClass('/reports')}"      id="nav-reports">
            <span class="nav-icon">📄</span> ${t('nav_reports')}
        </a>
        <a href="#/financials"   class="${navClass('/financials')}"   id="nav-financials">
            <span class="nav-icon">📊</span> ${t('nav_financials')}
        </a>
        <a href="#/ops"          class="${navClass('/ops')}"          id="nav-ops">
            <span class="nav-icon">⚙️</span> System Ops
        </a>
        <a href="#" id="nav-logout" class="nav-link nav-logout">
            <span class="nav-icon">🚪</span> ${t('nav_logout')}
        </a>
    `;


    const userBadge = isAuth && user ? `
        <div class="sidebar-user-badge">
            <div class="user-avatar">${(user.full_name || user.email)[0].toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${user.full_name || user.email.split('@')[0]}</div>
                <div class="user-role">${t('sidebar_user_role')}</div>
            </div>
        </div>
    ` : '';

    const html = `
        <aside class="sidebar" id="main-sidebar">
            <div class="sidebar-header">
                <a href="#/" class="logo-link">
                    <div class="logo-icon">✦</div>
                    <div>
                        <div class="logo-text">${t('sidebar_title')}</div>
                        <div class="logo-sub">${t('sidebar_subtitle')}</div>
                    </div>
                </a>
            </div>

            ${userBadge}

            <nav class="sidebar-nav" id="sidebar-nav">
                ${isAuth ? privateNav : publicNav}
            </nav>

            <div class="sidebar-footer">
                <div class="server-status" id="sidebar-server-status">
                    <span class="status-dot" id="sidebar-status-dot"></span>
                    <span id="sidebar-status-text">${t('sidebar_status_connecting')}</span>
                </div>
                <p class="footer-credit">${t('sidebar_credit')}</p>
            </div>
        </aside>
    `;

    const container = document.getElementById('sidebar-container');
    if (container) container.innerHTML = html;

    // Bind logout
    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
            router.navigate('/');
        });
    }

    // Check server status
    checkServerStatus();
}

async function checkServerStatus() {
    const dot  = document.getElementById('sidebar-status-dot');
    const text = document.getElementById('sidebar-status-text');
    if (!dot || !text) return;
    try {
        const { SystemService } = await import('../services/systemService.js');
        const res = await SystemService.checkHealth();
        if (res && res.status === 'ok') {
            dot.className  = 'status-dot online';
            text.textContent = t('sidebar_status_online');
        } else throw new Error();
    } catch {
        dot.className  = 'status-dot offline';
        text.textContent = t('sidebar_status_offline');
    }
}

