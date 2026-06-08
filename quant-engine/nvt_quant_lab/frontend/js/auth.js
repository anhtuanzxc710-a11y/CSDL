// ─── auth.js ─── Real Authentication using FastAPI ───
import { API_BASE } from './api.js';

const ACCESS_TOKEN_KEY = 'nvt_access_token';
const REFRESH_TOKEN_KEY = 'nvt_refresh_token';
const USER_KEY = 'nvt_auth_user';

export const Auth = {
    async login(email, password) {
        const body = new URLSearchParams();
        body.append('username', email); // OAuth2 expects username
        body.append('password', password);

        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });
        
        if (!res.ok) {
            let errorMsg = 'Login failed';
            try {
                const error = await res.json();
                errorMsg = error.detail || errorMsg;
            } catch (e) {
                errorMsg = `Error ${res.status}: ${res.statusText}`;
            }
            throw new Error(errorMsg);
        }

        const data = await res.json();
        this._saveTokens(data);
        await this.fetchCurrentUser();
        return this.getUser();
    },

    async register(email, password, fullName) {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName })
        });

        if (!res.ok) {
            let errorMsg = 'Registration failed';
            try {
                const error = await res.json();
                errorMsg = error.detail || errorMsg;
            } catch (e) {
                // If not JSON, use status text
                errorMsg = `Error ${res.status}: ${res.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        // Auto-login after registration
        return this.login(email, password);
    },

    async logout(informServer = true) {
        const rfToken = this.getRefreshToken();
        if (informServer && rfToken) {
            try {
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: rfToken })
                });
            } catch (e) {
                console.error("Failed to logout from server", e);
            }
        }
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        
        // Trigger a custom event to notify app about logout
        window.dispatchEvent(new Event('auth-status-changed'));
    },

    async fetchCurrentUser() {
        if (!this.getAccessToken()) return null;

        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${this.getAccessToken()}` }
            });
            if (res.ok) {
                const user = await res.json();
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                return user;
            }
            if (res.status === 401 || res.status === 403) {
                const refreshed = await this.refreshSession();
                if (refreshed) {
                    return this.fetchCurrentUser();
                } else {
                    this.logout(false);
                }
            }
        } catch (e) {
            console.error("Could not fetch current user", e);
        }
        return null; // Will reach here if token invalid and refresh failed
    },

    async refreshSession() {
        const rfToken = this.getRefreshToken();
        if (!rfToken) return false;

        try {
            const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rfToken })
            });

            if (res.ok) {
                const data = await res.json();
                this._saveTokens(data);
                return true;
            }
            
            // If refresh invalid, force logout
            this.logout(false);
            return false;
        } catch (e) {
            return false;
        }
    },

    isAuthenticated() {
        return !!this.getAccessToken() && !!this.getUser();
    },

    getUser() {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    _saveTokens(data) {
        if (data.access_token) {
            localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        }
        if (data.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        }
    }
};
