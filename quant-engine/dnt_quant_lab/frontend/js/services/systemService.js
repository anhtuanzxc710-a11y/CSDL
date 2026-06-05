import { http } from './http.js';

export const SystemService = {
    async getReports() {
        return http.get('/api/system/reports');
    },

    async generateReport(format) {
        return http.post(`/api/system/reports/generate?format=${format}`);
    },

    async checkHealth() {
        return http.get('/api/system/health');
    }
};
