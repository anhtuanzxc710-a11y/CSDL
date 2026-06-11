// ─── state.js ─── Global Application State ───
export const AppState = {
    // Current portfolio data (from Risk Analysis runs)
    lastSimulationResult: null,
    // Portfolio holdings cache for My Portfolio page
    portfolioHoldings: [],
    portfolios: [], // lists user's portfolios
    selectedPortfolioId: null, // the active portfolio

    activeChatThreadId: null, // current active thread

    currentLang: localStorage.getItem('nvt_lang') || 'vi',

    setSimulationResult(data) {
        this.lastSimulationResult = data;
        // Dispatch a custom event so any page can react
        window.dispatchEvent(new CustomEvent('simulation-updated', { detail: data }));
    },

    savePortfolio() {
        // No longer relying on localstorage for holdings
        // localStorage.setItem('nvt_portfolio', JSON.stringify(this.portfolioHoldings));
    },

    setLang(lang) {
        this.currentLang = lang;
        localStorage.setItem('nvt_lang', lang);
        // Dispatch event for UI to re-render if needed
        window.dispatchEvent(new CustomEvent('lang-changed', { detail: lang }));
    }

};
