import { http } from './http.js';
import { Auth } from '../auth.js';
import { API_BASE } from '../api.js';

export const ChatService = {
    async getThreads() {
        return http.get('/api/chat/threads');
    },

    async createThread(title = 'New Conversation') {
        return http.post('/api/chat/threads', { title });
    },

    async getMessages(threadId) {
        return http.get(`/api/chat/threads/${threadId}/messages`);
    },

    async addMessage(threadId, role, content) {
        return http.post(`/api/chat/threads/${threadId}/messages`, { role, content });
    },

    async fetchAIAdviceStream(payload) {
        let token = Auth.getAccessToken();
        let res = await fetch(`${API_BASE}/api/ai-advice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 401 && Auth.getRefreshToken()) {
            const refreshed = await Auth.refreshSession();
            if (refreshed) {
                token = Auth.getAccessToken();
                res = await fetch(`${API_BASE}/api/ai-advice`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                Auth.logout(false);
            }
        }
        return res;
    }
};
