import { Auth } from '../auth.js';
import { API_BASE } from '../api.js';

export const http = {
    async request(endpoint, options = {}) {
        let headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = Auth.getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized by attempting to refresh token
        if (response.status === 401 && Auth.getRefreshToken()) {
            const refreshed = await Auth.refreshSession();
            if (refreshed) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${Auth.getAccessToken()}`;
                response = await fetch(`${API_BASE}${endpoint}`, {
                    ...options,
                    headers
                });
            } else {
                Auth.logout(false); // Force logout
            }
        }

        // Return empty string for 204 No Content
        if (response.status === 204) {
            return '';
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw { status: response.status, data };
        }

        return data;
    },

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    patch(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
};
