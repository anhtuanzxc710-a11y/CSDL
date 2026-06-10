// ─── router.js ─── Hash-based SPA Router ───
import { Auth } from './auth.js';

const PROTECTED_ROUTES = ['/dashboard', '/portfolio', '/risk-analysis', '/revenue', '/ai-assistant', '/reports', '/financials', '/optimization', '/quant', '/quant/backtest'];
const PUBLIC_ROUTES    = ['/', '/login', '/register'];

export class Router {
    constructor(routes) {
        this.routes = routes;  // { '/path': () => HTMLString or element }
        this._currentCleanup = null;
        window.addEventListener('hashchange', () => this._resolve());
        window.addEventListener('load',       () => this._resolve());
    }

    navigate(path) {
        window.location.hash = '#' + path;
    }

    _getCurrentPath() {
        const hash = window.location.hash;
        if (!hash || hash === '#') return '/';
        return hash.replace('#', '') || '/';
    }

    _resolve() {
        const path = this._getCurrentPath();

        // Auth guard - Real Backend Validation
        if (PROTECTED_ROUTES.includes(path)) {
            if (!Auth.isAuthenticated()) {
                this.navigate('/login');
                return;
            } else {
                // Must validate JWT with the backend definitively
                Auth.fetchCurrentUser().then(user => {
                    if (!user) {
                        this.navigate('/login');
                    }
                });
            }
        }
        if ((path === '/login' || path === '/register') && Auth.isAuthenticated()) {
            this.navigate('/dashboard');
            return;
        }

        // Clean up previous view
        if (typeof this._currentCleanup === 'function') {
            try {
                this._currentCleanup();
            } catch (err) {
                console.error("Error running cleanup function:", err);
            }
            this._currentCleanup = null;
        }

        const handler = this.routes[path] || this.routes['/'];
        if (handler) {
            const result = handler();
            if (result) {
                if (result instanceof Promise) {
                    result.then(res => {
                        if (res && typeof res.cleanup === 'function') {
                            this._currentCleanup = res.cleanup;
                        }
                    }).catch(err => console.error("Error resolving view handler:", err));
                } else if (typeof result.cleanup === 'function') {
                    this._currentCleanup = result.cleanup;
                }
            }
        }
    }
}
