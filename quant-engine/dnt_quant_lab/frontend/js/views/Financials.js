import { getFinancials } from '../api.js';
import { t } from '../i18n.js';

export function renderFinancials() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
    <div class="page-content" id="financials-page">
        <div class="page-header">
            <h1 class="page-title">📄 ${t('nav_financials')}</h1>
            <div class="page-subtitle">${t('fin_subtitle')} (TCBS Integration)</div>
        </div>

        <div class="glass-card" style="padding: 2rem; margin-bottom: 2rem; max-width: 600px;">
            <h3 style="margin-bottom: 1.5rem;">${t('fin_title')}</h3>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="fin-search-ticker" class="form-input" placeholder="VD: FPT, MWG, VCB..." style="flex: 1;">
                <button id="btn-fetch-financials" class="btn-primary">${t('fin_search_btn')}</button>
            </div>
            <p class="caption" style="margin-top: 1rem; color: var(--text-muted);">
                ${t('fin_search_hint')}
            </p>
        </div>

        <div id="fin-loading" style="display:none; margin: 2rem 0;">
            <div class="loading-spinner"></div>
            <p style="text-align:center; margin-top:10px; color:var(--neon-blue);">${t('fin_loading_tcbs')}</p>
        </div>

        <div id="fin-results" style="display:none;">
            <div class="glass-card results-card" style="padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                    <div>
                        <h2 id="res-ticker" class="neon-blue" style="font-size: 2.5rem; margin: 0;">--</h2>
                        <div id="res-industry" class="caption" style="font-size: 1.1rem; color: var(--text-muted);">--</div>
                    </div>
                </div>

                <div class="metrics-grid-6">
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_cap')}</span>
                        <strong id="res-marketcap" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_pepb')}</span>
                        <strong id="res-pepb" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_roe')}</span>
                        <strong id="res-roeroa" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_debt')}</span>
                        <strong id="res-debt" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_profit')}</span>
                        <strong id="res-profit" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_rev')}</span>
                        <strong id="res-revenue" class="metric-val">--</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    bindFinancialsEvents();
}

function bindFinancialsEvents() {
    const btn = document.getElementById('btn-fetch-financials');
    const input = document.getElementById('fin-search-ticker');

    const fetchData = async () => {
        const ticker = input.value.trim().toUpperCase();
        if (!ticker) return;

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = t('ai_analyzing'); 
        document.getElementById('fin-loading').style.display = 'block';
        document.getElementById('fin-results').style.display = 'none';

        try {
            const data = await getFinancials(ticker);
            if (data.error) throw new Error(data.error);

            document.getElementById('res-ticker').textContent = data.ticker;
            document.getElementById('res-industry').textContent = data.industry || '--';
            document.getElementById('res-marketcap').textContent = data.marketCap ? (data.marketCap).toLocaleString() : '--';
            document.getElementById('res-pepb').textContent = `${(data.pe || 0).toFixed(2)} | ${(data.pb || 0).toFixed(2)}`;
            document.getElementById('res-roeroa').textContent = `${(data.roe || 0).toFixed(2)}% | ${(data.roa || 0).toFixed(2)}%`;
            document.getElementById('res-debt').textContent = `${(data.debt_on_equity || 0).toFixed(2)} Lần`;
            document.getElementById('res-profit').textContent = `${(data.profit_growth || 0).toFixed(2)}%`;
            document.getElementById('res-revenue').textContent = `${(data.revenue_growth || 0).toFixed(2)}%`;

            document.getElementById('fin-results').style.display = 'block';
        } catch (err) {
            alert(t('fin_error_fetch') + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = t('fin_search_btn');
            document.getElementById('fin-loading').style.display = 'none';
        }
    };

    btn.addEventListener('click', fetchData);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchData();
    });
}

