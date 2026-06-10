// Real API calls to existing FastAPI backend.
import { Auth } from './auth.js';
// Mock data is only used as fallback when backend is not running.

export const API_BASE = '';  // Same-origin: FastAPI serves frontend too

// ── Helpers ──────────────────────────────────────────────────────────────────
async function post(endpoint, body) {
    const token = Auth.getAccessToken();
    const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        let errMsg = `API Error ${res.status}: ${endpoint}`;
        try {
            const errData = await res.json();
            if (errData.detail) {
                if (typeof errData.detail === 'string') errMsg = errData.detail;
                else errMsg = JSON.stringify(errData.detail);
            }
        } catch (e) { /* ignore parse error */ }
        throw new Error(errMsg);
    }
    return res.json();
}

async function get(endpoint) {
    const token = Auth.getAccessToken();
    const res = await fetch(API_BASE + endpoint, {
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    });
    if (!res.ok) throw new Error(`API Error ${res.status}: ${endpoint}`);
    return res.json();
}

// ── Core Quant API Calls (wrapping existing backend endpoints) ────────────────

/**
 * POST /api/run-simulation
 * Monte Carlo + Efficient Frontier + Backtest + Signals + Metrics
 */
export async function runSimulation({ capital, target_return, tickers, lang = 'vi' }) {
    return post('/api/run-simulation', { capital, target_return, tickers, lang });
}

/**
 * POST /api/evaluate-portfolio
 * Evaluate custom portfolio with real holdings (qty-based)
 */
export async function evaluatePortfolio({ holdings, days = 63, lang = 'vi' }) {
    return post('/api/evaluate-portfolio', { holdings, days, lang });
}

/**
 * POST /api/ai-advice — returns a streaming response
 * Returns the raw fetch Response for streaming handling.
 */
export async function fetchAIAdviceStream(data) {
    const token = Auth.getAccessToken();
    const lang = data.lang || 'vi';
    
    let res = await fetch(API_BASE + '/api/ai-advice', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
            ...data,
            lang: lang
        })
    });

    // Handle 401 by attempting refresh and retry once
    if (res.status === 401 && Auth.getRefreshToken()) {
        const refreshed = await Auth.refreshSession();
        if (refreshed) {
            const newToken = Auth.getAccessToken();
            res = await fetch(API_BASE + '/api/ai-advice', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newToken}`
                },
                body: JSON.stringify({
                    ...data,
                    lang: lang
                })
            });
        } else {
            Auth.logout(false);
        }
    }

    if (!res.ok) {
        let errMessage = 'AI API Error';
        try {
            const errData = await res.json();
            errMessage = errData.detail || errMessage;
        } catch {
            // fallback if not json
        }
        throw new Error(errMessage);
    }
    return res;  // streaming response — caller reads body
}

/**
 * GET /api/current-prices?tickers=FPT,VCB
 */
export async function getCurrentPrices(tickers) {
    return get(`/api/current-prices?tickers=${tickers.join(',')}`);
}

/**
 * GET /api/news?tickers=FPT,VCB
 */
export async function getNews(tickers) {
    try {
        return get(`/api/news?tickers=${tickers.join(',')}`);
    } catch {
        return {};
    }
}

/**
 * GET /api/financials/:ticker
 */
export async function getFinancials(ticker) {
    return get(`/api/financials/${ticker}`);
}

/**
 * POST /api/optimization/optimize
 * Advanced Portfolio Optimization (Black-Litterman)
 */
export async function optimizeBlackLitterman(payload) {
    return post('/api/optimization/optimize', payload);
}

/**
 * POST /api/quant/analyze
 * Quant App Core Analysis
 */
export async function analyzeQuant(payload) {
    return post('/api/quant/analyze', payload);
}

/**
 * POST /api/quant/backtest
 * Portfolio Backtest Engine
 */
export async function runBacktest(payload) {
    return post('/api/quant/backtest', payload);
}

/**
 * POST /api/quant/optimize
 * Portfolio Optimization
 */
export async function runOptimize(payload) {
    return post('/api/quant/optimize', payload);
}

/**
 * POST /api/quant/optimize-and-backtest
 * Portfolio Optimization and Backtesting combined
 */
export async function runOptimizeAndBacktest(payload) {
    return post('/api/quant/optimize-and-backtest', payload);
}

/**
 * POST /api/ai/research
 * Generate AI Investment Research Report
 */
export async function runAIResearch(payload) {
    return post('/api/ai/research', payload);
}

/**
 * POST /api/ai/research/export-docx
 * Export AI research report to Word DOCX
 */
export async function exportResearchDocx(payload) {
    const token = Auth.getAccessToken();
    const res = await fetch(API_BASE + '/api/ai/research/export-docx', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`DOCX Export Error ${res.status}`);
    return res.blob();
}

// ── Mock helper functions removed as per MVP Database Hardening requirements ──

/**
 * GET /api/health/dependencies
 */
export async function getHealthDependencies() {
    return get('/api/health/dependencies');
}

/**
 * GET /api/system/audit-logs
 */
export async function getAuditLogs() {
    return get('/api/system/audit-logs');
}

