import { http } from './http.js';

export const PortfolioService = {
    async getPortfolios() {
        return http.get('/api/portfolios');
    },
    
    async createPortfolio(name, description = '', type = 'custom', baseCurrency = 'VND') {
        return http.post('/api/portfolios', { 
            name, 
            description, 
            type, 
            base_currency: baseCurrency 
        });
    },

    async setDefaultPortfolio(portfolioId) {
        return http.post(`/api/portfolios/${portfolioId}/set-default`);
    },

    async getHoldings(portfolioId) {
        return http.get(`/api/portfolios/${portfolioId}/holdings`);
    },

    async getTransactions(portfolioId) {
        return http.get(`/api/portfolios/${portfolioId}/transactions`);
    },

    async addTransaction(portfolioId, payload) {
        return http.post(`/api/portfolios/${portfolioId}/transactions`, payload);
    },

    async deleteTransaction(portfolioId, txId) {
        return http.delete(`/api/portfolios/${portfolioId}/transactions/${txId}`);
    },

    async updateTransaction(portfolioId, txId, payload) {
        return http.put(`/api/portfolios/${portfolioId}/transactions/${txId}`, payload);
    },

    async updateHolding(portfolioId, ticker, quantity, avgCost) {
        return http.put(`/api/portfolios/${portfolioId}/holdings/${ticker}`, {
            quantity: parseFloat(quantity),
            avg_cost: parseFloat(avgCost)
        });
    }
};
