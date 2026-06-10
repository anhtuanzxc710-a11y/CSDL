// ─── app.js ─── Main Application Entry Point ───
import { Auth }             from './auth.js';
import { Router }           from './router.js';

// Make router available globally BEFORE routes are defined
let router;
import { renderSidebar }    from './components/Sidebar.js';
import { renderTopbar }     from './components/Topbar.js';
import { initChatWidget }   from './components/ChatWidget.js';
import { renderLanding }    from './views/Landing.js';
import { renderLogin, renderRegister } from './views/Auth.js';
import { renderDashboard }  from './views/Dashboard.js';
import { renderPortfolio }  from './views/Portfolio.js';
import { renderRiskAnalysis } from './views/RiskAnalysis.js';
import { renderRevenue }    from './views/Revenue.js';
import { renderAIAssistant } from './views/AIAssistant.js';
import { renderReports }    from './views/Reports.js';
import { renderFinancials } from './views/Financials.js';
import { renderOptimization } from './views/Optimization.js';
import { renderQuant } from './views/Quant.js';
import { renderBacktest } from './views/Backtest.js';
import { renderOptimizer } from './views/Optimizer.js';
import { renderAIResearch } from './views/AIResearch.js';

// ── Layout renderer (sidebar + topbar re-render on each route) ─────────────
function renderLayout() {
    // Always re-render sidebar to reflect current auth state
    renderSidebar(router);
    renderTopbar();
}

// ── Route handlers ─────────────────────────────────────────────────────────
const routes = {
    '/': () => {
        renderLayout();
        return renderLanding();
    },
    '/login': () => {
        renderLayout();
        return renderLogin(router);
    },
    '/register': () => {
        renderLayout();
        return renderRegister(router);
    },
    '/dashboard': () => {
        renderLayout();
        showChatWidget();
        return renderDashboard();
    },
    '/portfolio': () => {
        renderLayout();
        showChatWidget();
        return renderPortfolio();
    },
    '/risk-analysis': () => {
        renderLayout();
        showChatWidget();
        return renderRiskAnalysis();
    },
    '/revenue': () => {
        renderLayout();
        showChatWidget();
        return renderRevenue();
    },
    '/ai-assistant': () => {
        renderLayout();
        showChatWidget();
        return renderAIAssistant();
    },
    '/reports': () => {
        renderLayout();
        showChatWidget();
        return renderReports();
    },
    '/financials': () => {
        renderLayout();
        showChatWidget();
        return renderFinancials();
    },
    '/optimization': () => {
        renderLayout();
        showChatWidget();
        return renderOptimization();
    },
    '/quant': () => {
        renderLayout();
        showChatWidget();
        return renderQuant();
    },
    '/quant/backtest': () => {
        renderLayout();
        showChatWidget();
        return renderBacktest();
    },
    '/quant/optimizer': () => {
        renderLayout();
        showChatWidget();
        return renderOptimizer();
    },
    '/ai-analyst': () => {
        renderLayout();
        showChatWidget();
        return renderAIResearch();
    },
};

// ── Router init ────────────────────────────────────────────────────────────
router = new Router(routes);

// ── Chat widget: only for authed pages ────────────────────────────────────
function showChatWidget() {
    if (Auth.isAuthenticated()) {
        initChatWidget();
    }
}

// ── Start ──────────────────────────────────────────────────────────────────
async function initApp() {
    try {
        await Auth.fetchCurrentUser();
    } catch(e) {
        // failed to fetch auth, will default to public routes
    }
    
    // Listen to custom auth changes
    window.addEventListener('auth-status-changed', () => {
        if (!Auth.isAuthenticated()) {
            router.navigate('/login');
        } else {
            router.navigate('/dashboard');
        }
    });

    // Listen to language changes
    window.addEventListener('lang-changed', () => {
        renderLayout();
        // and re-resolve current route to update view content if it's using i18n
        router._resolve();
    });


    // If hash is empty on first load, set to /
    if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = Auth.isAuthenticated() ? '#/dashboard' : '#/';
    } else {
        // trigger initial route explicitly if not changing hash
        router._resolve();
    }
}

initApp();
