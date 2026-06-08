// ─── router.js ─── Hash-based SPA Router ───
import { Auth } from './auth.js';

const PROTECTED_ROUTES = ['/dashboard', '/portfolio', '/risk-analysis', '/revenue', '/ai-assistant', '/reports', '/financials', '/optimization'];
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
            this._currentCleanup();
            this._currentCleanup = null;
        }

        const handler = this.routes[path] || this.routes['/'];
        if (handler) {
            const result = handler();
            if (result && typeof result.cleanup === 'function') {
                this._currentCleanup = result.cleanup;
            }
        }
    }
}
