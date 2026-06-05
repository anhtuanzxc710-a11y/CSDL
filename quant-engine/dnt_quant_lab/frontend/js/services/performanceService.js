import { http } from './http.js';

export const PerformanceService = {
    async getPerformance(portfolioId) {
        return http.get(`/api/portfolios/${portfolioId}/performance`);
    }
};
