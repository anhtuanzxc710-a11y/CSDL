import { AppState }           from '../state.js';
import { runSimulation, evaluatePortfolio, fetchAIAdviceStream, getCurrentPrices, getNews } from '../api.js';
import { t } from '../i18n.js';

function fmtVND(v) { return Math.floor(v ?? 0).toLocaleString('vi-VN') + '₫'; }
function fmtPct(v, decimals = 2) { return v != null ? (v * 100).toFixed(decimals) + '%' : '--'; }

export async function renderRiskAnalysis() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Load holdings if empty in AppState
    if (!AppState.portfolioHoldings || AppState.portfolioHoldings.length === 0) {
        main.innerHTML = `
            <div class="page-content">
                <div class="page-header">
                    <h1 class="page-title">🔬 ${t('nav_risk')}</h1>
                    <div class="page-subtitle">${t('risk_subtitle')}</div>
                </div>
                <div class="glass-card" style="padding:2rem; text-align:center; color:var(--text-muted);">
                    <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                    <p>${t('ptf_loading')}</p>
                </div>
            </div>
        `;
        
        try {
            const { PortfolioService } = await import('../services/portfolioService.js');
            let portfolios = await PortfolioService.getPortfolios();
            if (portfolios && portfolios.length > 0) {
                const activePtf = portfolios.find(p => p.is_default) || portfolios[0];
                const holdingsRes = await PortfolioService.getHoldings(activePtf.id);
                const enriched = holdingsRes.items || [];
                AppState.portfolioHoldings = enriched.map(item => ({
                    ticker: item.ticker,
                    qty: item.quantity,
                    avgCost: item.avg_cost
                }));
            }
        } catch (e) {
            console.error("Lỗi tải thông tin portfolio cho Risk Analysis:", e);
        }
    }

    const lang = AppState.currentLang || 'vi';

    const tickers = (AppState.portfolioHoldings || []).map(h => h.ticker).join(', ');
    const totalInvested = (AppState.portfolioHoldings || []).reduce((sum, h) => sum + (h.qty * h.avgCost), 0);
    
    // Format total invested capital with dots, fallback to '100.000.000' if 0
    const formattedCapital = totalInvested > 0 
        ? Math.floor(totalInvested).toLocaleString('vi-VN').replace(/,/g, '.') 
        : '100.000.000';

    main.innerHTML = `
    <div class="page-content" id="risk-page">
        <div class="page-header">
            <h1 class="page-title">🔬 ${t('nav_risk')}</h1>
            <div class="page-subtitle">${t('risk_subtitle')}</div>
        </div>

        <!-- Mode Tabs -->
        <div class="mode-tabs glass-card" style="padding:1rem;">
            <button class="mode-tab active" id="tab-optimizer" data-mode="optimizer">${t('risk_tab_opt')}</button>
            <button class="mode-tab"        id="tab-evaluator" data-mode="evaluator">${t('risk_tab_eval')}</button>
        </div>

        <!-- Optimizer Input Panel -->
        <div id="panel-optimizer" class="input-panel glass-card">
            <h3 style="margin-bottom:1.2rem;">${t('risk_opt_title')}</h3>
            <div class="input-row">
                <div class="form-group">
                    <label>${t('risk_opt_tickers')}</label>
                    <input type="text" id="opt-tickers" class="form-input" placeholder="VD: FPT, VCB, MWG, GAS, HPG"
                        value="${tickers}"/>
                </div>
                <div class="form-group">
                    <label>${t('risk_opt_capital')}</label>
                    <input type="text" id="opt-capital" class="form-input" placeholder="VD: 1.000.000.000" value="${formattedCapital}"/>
                </div>
                <div class="form-group">
                    <label>${t('risk_opt_return')}</label>
                    <input type="number" id="opt-return" class="form-input" placeholder="10" value="10"/>
                </div>
            </div>
            <div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap;">
                <button class="btn-primary" id="btn-run-sim" style="flex:1; min-width:180px;">${t('risk_btn_run_sim')}</button>
                <button class="btn-alert" id="btn-stress-show" style="display:none;">${t('risk_btn_stress')}</button>
            </div>
        </div>

        <!-- Evaluator Input Panel -->
        <div id="panel-evaluator" class="input-panel glass-card" style="display:none;">
            <h3 style="margin-bottom:1.2rem;">${t('risk_eval_title')}</h3>
            <div id="eval-holdings-list">
                ${(AppState.portfolioHoldings || []).map((h,i) => `
                    <div class="holding-row-new" data-idx="${i}">
                        <input type="text"   class="form-input eval-ticker" placeholder="${t('dash_col_ticker')}" value="${h.ticker}" style="width:110px; text-transform:uppercase;"/>
                        <input type="number" class="form-input eval-qty"    placeholder="${t('ptf_col_qty')}" value="${h.qty}" style="width:110px;"/>
                        <input type="number" class="form-input eval-cost"   placeholder="Giá vốn" value="${h.avgCost || ''}" style="width:130px;"/>
                        <button class="btn-remove-row">✕</button>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap; align-items:center;">
                <button id="btn-add-eval-row" class="btn-ghost btn-sm">${t('risk_eval_add')}</button>
                <div class="form-group" style="margin:0">
                    <select id="eval-timeframe" class="form-input" style="width:auto;">
                        <option value="21">${lang === 'vi' ? '1 tháng' : '1 month'}</option>
                        <option value="63" selected>${lang === 'vi' ? '3 tháng' : '3 months'}</option>
                        <option value="126">${lang === 'vi' ? '6 tháng' : '6 months'}</option>
                        <option value="252">${lang === 'vi' ? '1 năm' : '1 year'}</option>
                    </select>
                </div>
                <div class="live-capital-display">
                    ${lang === 'vi' ? 'Vốn đầu tư ban đầu' : 'Initial Capital'}: <strong id="eval-live-capital">--</strong>
                    <span style="margin:0 0.5rem; color:var(--text-muted)">|</span>
                    ${lang === 'vi' ? 'Giá trị thị trường' : 'Market Value'}: <strong id="eval-market-value">--</strong>
                </div>
                <button class="btn-primary" id="btn-run-eval" style="margin-left:auto;">${t('risk_eval_btn')}</button>
            </div>
        </div>

        <!-- Loading -->
        <div id="risk-loading" style="display:none;" class="loading-overlay glass-card">
            <div class="loading-spinner"></div>
            <p id="risk-loading-text">${t('risk_loading_mc')}</p>
        </div>

        <!-- Results -->
        <div id="risk-results" style="display:none;">

            <!-- Key Metric Cards -->
            <div class="stats-grid" id="risk-key-metrics">
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(0,255,170,0.1); color:var(--neon-green)">💰</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('risk_metric_expected')}</div>
                        <div class="stat-value neon-green" id="rm-expected">--</div>
                        <div class="stat-sub" id="rm-ci">${t('risk_metric_ci')}: --</div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(255,85,85,0.1); color:var(--neon-alert)">⚠️</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('risk_metric_var')}</div>
                        <div class="stat-value" id="rm-var" style="color:var(--neon-alert)">--</div>
                        <div class="stat-sub" id="rm-stress" style="display:none; color:#F59E0B;"></div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(139,92,246,0.1); color:#a78bfa">📊</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('risk_metric_sharpe')}</div>
                        <div class="stat-value" id="rm-sharpe" style="color:#a78bfa">--</div>
                        <div class="stat-sub">Risk-adjusted return</div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(245,158,11,0.1); color:#F59E0B">📉</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('risk_metric_mdd')}</div>
                        <div class="stat-value" id="rm-mdd" style="color:#F59E0B">--</div>
                        <div class="stat-sub" id="rm-mdd-warn"></div>
                    </div>
                </div>
            </div>

            <!-- Efficient Frontier Chart -->
            <div class="glass-card chart-card" id="frontier-card" style="display:none;">
                <div class="card-header">
                    <h3>${t('risk_chart_frontier')}</h3>
                    <span class="badge-info">Max Sharpe ★</span>
                </div>
                <div id="frontier-chart" style="height:380px;"></div>
            </div>

            <!-- Backtest + Allocation side by side -->
            <div class="two-col-grid">
                <div class="glass-card chart-card" id="backtest-card" style="display:none;">
                    <div class="card-header">
                        <h3>${t('risk_chart_backtest')}</h3>
                        <span class="badge-neutral">Backtrader</span>
                    </div>
                    <p class="caption" style="margin-left: 1rem; margin-top: -0.5rem; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem;">
                        ${lang === 'vi' ? '* Giả lập đã bao gồm phí giao dịch 0.1% và độ trượt giá 0.05%' : '* Simulation includes 0.1% commission and 0.05% slippage'}
                    </p>
                    <div id="backtest-chart" style="height:320px;"></div>
                </div>
                <div class="glass-card chart-card" id="allocation-card" style="display:none;">
                    <div class="card-header">
                        <h3>${t('risk_chart_alloc')}</h3>
                        <span class="badge-neutral">MVO</span>
                    </div>
                    <div id="allocation-chart" style="height:320px;"></div>
                </div>
            </div>

            <!-- Advanced Metrics -->
            <div class="glass-card" id="adv-metrics-card" style="display:none; padding:1.5rem;">
                <div class="card-header" style="margin-bottom:1rem;">
                    <h3>⚡ Advanced Quant Metrics</h3>
                    <span class="badge-info">vs VNINDEX</span>
                </div>
                <div class="metrics-grid-6">
                    <div class="metric-box"><span class="metric-label">Beta</span><strong id="adv-beta" class="metric-val neon-blue">--</strong></div>
                    <div class="metric-box"><span class="metric-label">Sortino Ratio</span><strong id="adv-sortino" class="metric-val neon-green">--</strong></div>
                    <div class="metric-box"><span class="metric-label">Treynor Ratio</span><strong id="adv-treynor" class="metric-val" style="color:#F59E0B">--</strong></div>
                    <div class="metric-box"><span class="metric-label">R-Squared</span><strong id="adv-rsq" class="metric-val" style="color:#8B5CF6">--</strong></div>
                    <div class="metric-box"><span class="metric-label">Calmar Ratio</span><strong id="adv-calmar" class="metric-val" style="color:#EC4899">--</strong></div>
                    <div class="metric-box"><span class="metric-label">Max Drawdown</span><strong id="adv-mdd" class="metric-val neon-alert">--</strong></div>
                </div>
            </div>

            <!-- Trading Signals -->
            <div class="glass-card" id="signals-card" style="display:none; padding:1.5rem;">
                <div class="card-header" style="margin-bottom:1rem;">
                    <h3>${t('risk_signals_title')}</h3>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('dash_col_ticker')}</th>
                                <th>${t('risk_col_signal')}</th>
                                <th>${t('risk_col_volume')}</th>
                                <th class="text-right">${t('risk_col_order')}</th>
                            </tr>
                        </thead>
                        <tbody id="signals-tbody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Prices Table -->
            <div class="glass-card" id="prices-card" style="display:none; padding:1.5rem;">
                <div class="card-header" style="margin-bottom:1rem;">
                    <h3>${t('risk_prices_title')}</h3>
                    <span class="meta-text" id="prices-date"></span>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead><tr><th>${t('dash_col_ticker')}</th><th class="text-right">${t('dash_col_price')}</th></tr></thead>
                        <tbody id="prices-tbody"></tbody>
                    </table>
                </div>
            </div>

            <!-- AI Advice Panel -->
            <div class="glass-card ai-advice-panel" id="ai-panel" style="display:none;">
                <div class="ai-panel-header">
                    <div>
                        <h3 class="ai-panel-title"><span class="ai-gem-icon">✦</span> ${t('risk_ai_advisor')}</h3>
                        <p class="caption">${t('risk_ai_caption')}</p>
                    </div>
                    <div style="display:flex; gap:0.75rem; align-items:center;">
                        <button id="btn-download-pdf" class="btn-ghost btn-sm" style="display:none;">⬇️ PDF</button>
                        <div class="ai-badge" id="ai-status-badge">
                            <span class="ai-badge-dot"></span>
                            <span id="ai-badge-text">${t('ai_analyzing')}</span>
                        </div>
                    </div>
                </div>
                <div class="ai-divider"></div>
                <div id="ai-loading" class="ai-loading">
                    <div class="ai-loading-dots"><span></span><span></span><span></span></div>
                    <span>${t('risk_ai_loading')}</span>
                </div>
                <div id="ai-text" class="ai-text"></div>
            </div>

        </div><!-- /#risk-results -->
    </div><!-- /#risk-page -->
    `;


    bindRiskAnalysisEvents();
}

function bindRiskAnalysisEvents() {
    // Tab switching
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const mode = tab.dataset.mode;
            document.getElementById('panel-optimizer').style.display = mode === 'optimizer' ? 'block' : 'none';
            document.getElementById('panel-evaluator').style.display = mode === 'evaluator' ? 'block' : 'none';
        });
    });

    // Add evaluator row
    document.getElementById('btn-add-eval-row').addEventListener('click', () => {
        const list = document.getElementById('eval-holdings-list');
        const row  = document.createElement('div');
        row.className = 'holding-row-new';
        row.innerHTML = `
            <input type="text"   class="form-input eval-ticker" placeholder="Mã CP" style="width:110px; text-transform:uppercase;"/>
            <input type="number" class="form-input eval-qty"    placeholder="KL"    style="width:110px;"/>
            <input type="number" class="form-input eval-cost"   placeholder="Giá vốn" style="width:130px;"/>
            <button class="btn-remove-row">✕</button>
        `;
        row.querySelector('.btn-remove-row').addEventListener('click', () => { row.remove(); updateLiveCapital(); });
        list.appendChild(row);
        bindLiveCapitalListeners();
    });

    // Remove row buttons (initial rows)
    document.querySelectorAll('.btn-remove-row').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('.holding-row-new').remove(); updateLiveCapital(); });
    });

    // Live capital debounce
    bindLiveCapitalListeners();

    // Run Optimizer
    document.getElementById('btn-run-sim').addEventListener('click', runOptimizer);

    // Run Evaluator
    document.getElementById('btn-run-eval').addEventListener('click', runEvaluator);

    // Stress Test reveal
    document.getElementById('btn-stress-show').addEventListener('click', () => {
        const data = AppState.lastSimulationResult;
        if (!data?.stress_test) return;
        const stressEl = document.getElementById('rm-stress');
        stressEl.style.display = 'block';
        stressEl.textContent = `${t('risk_error_vni')}: -${fmtVND(Math.abs(data.stress_test.estimated_loss_vnd))}`;
    });

    // Initial load of estimated capital
    updateLiveCapital();
}


function bindLiveCapitalListeners() {
    let timer;
    document.querySelectorAll('.eval-ticker, .eval-qty, .eval-cost').forEach(el => {
        el.removeEventListener('input', scheduleUpdate);
        el.addEventListener('input', scheduleUpdate);
    });
    function scheduleUpdate() {
        clearTimeout(timer);
        timer = setTimeout(updateLiveCapital, 500);
    }
}

async function updateLiveCapital() {
    const tickers = [...document.querySelectorAll('.eval-ticker')].map(i => i.value.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) { 
        document.getElementById('eval-live-capital').textContent = '--'; 
        document.getElementById('eval-market-value').textContent = '--';
        return; 
    }
    
    let prices = {};
    try {
        prices = await getCurrentPrices(tickers);
    } catch (e) {
        console.error("Lỗi lấy giá hiện tại cho live capital display:", e);
    }

    let totalCost = 0;
    let totalMarket = 0;

    document.querySelectorAll('.holding-row-new').forEach(row => {
        const t = row.querySelector('.eval-ticker')?.value.trim().toUpperCase();
        const q = parseFloat(row.querySelector('.eval-qty')?.value);
        let c = parseFloat(row.querySelector('.eval-cost')?.value);

        if (!t || isNaN(q)) return;

        // Fallback logic cho giá vốn nếu rỗng
        if (isNaN(c) || c <= 0) {
            const found = AppState.portfolioHoldings?.find(h => h.ticker === t);
            if (found && found.avgCost) {
                c = found.avgCost;
            } else if (prices[t]) {
                c = prices[t];
            } else {
                c = 0;
            }
        }

        const marketPrice = prices[t] || c;

        totalCost += q * c;
        totalMarket += q * marketPrice;
    });

    document.getElementById('eval-live-capital').textContent = fmtVND(totalCost);
    document.getElementById('eval-market-value').textContent = totalMarket > 0 ? fmtVND(totalMarket) : 'Offline';
}

async function runOptimizer() {
    const tickersRaw = document.getElementById('opt-tickers').value;
    const tickers    = tickersRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const capitalRaw = document.getElementById('opt-capital').value.replace(/\./g, '').replace(/,/g, '');
    const capital    = parseFloat(capitalRaw);
    const ret        = parseFloat(document.getElementById('opt-return').value) / 100;

    if (tickers.length < 2 || isNaN(capital) || isNaN(ret)) {
        alert(AppState.currentLang === 'vi' ? 'Cần ít nhất 2 mã và vốn hợp lệ.' : 'Need at least 2 tickers and valid capital.'); return;
    }

    showLoading(t('risk_loading_mc'));

    try {
        const [simData, newsData] = await Promise.all([
            runSimulation({ capital, target_return: ret, tickers, lang: AppState.currentLang || 'vi' }),
            getNews(tickers).catch(() => ({}))
        ]);

        simData.news_data = newsData;
        handleResults(simData);
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

async function runEvaluator() {
    const lang = AppState.currentLang || 'vi';
    const holdings = {};
    document.querySelectorAll('.holding-row-new').forEach(row => {
        const t = row.querySelector('.eval-ticker')?.value.trim().toUpperCase();
        const q = parseFloat(row.querySelector('.eval-qty')?.value);
        let c = parseFloat(row.querySelector('.eval-cost')?.value);

        if (t && !isNaN(q)) {
            if (isNaN(c) || c <= 0) {
                const found = AppState.portfolioHoldings?.find(h => h.ticker === t);
                if (found && found.avgCost) {
                    c = found.avgCost;
                } else {
                    c = 0; // Backend sẽ tự động fallback về giá thị trường
                }
            }
            holdings[t] = {
                quantity: q,
                cost: c
            };
        }
    });
    const days = parseInt(document.getElementById('eval-timeframe').value);

    if (Object.keys(holdings).length === 0) { alert(AppState.currentLang === 'vi' ? 'Nhập ít nhất 1 mã và khối lượng' : 'Enter at least 1 ticker and quantity'); return; }

    showLoading(lang === 'vi' ? 'Đang định giá danh mục thực tế...' : 'Evaluating actual portfolio...');

    try {
        const [simData, newsData] = await Promise.all([
            evaluatePortfolio({ holdings, days, lang: AppState.currentLang || 'vi' }),
            getNews(Object.keys(holdings)).catch(() => ({}))
        ]);

        simData.news_data = newsData;
        handleResults(simData);
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

function handleResults(data) {
    hideLoading();
    AppState.setSimulationResult(data);

    document.getElementById('risk-results').style.display = 'block';
    document.getElementById('btn-stress-show').style.display = 'inline-block';

    const mc     = data.monte_carlo;
    const vals   = mc?.monetary_values;
    const adv    = data.advanced_metrics;
    const stress = data.stress_test;

    // Key metric cards
    if (vals) {
        document.getElementById('rm-expected').textContent = fmtVND(vals.expected_value);
        document.getElementById('rm-ci').textContent = `95%: [${fmtVND(vals.ci_lower_value)} → ${fmtVND(vals.ci_upper_value)}]`;

        const varLoss = vals.var_value_loss;
        const varEl   = document.getElementById('rm-var');
        if (varLoss >= 0) {
            varEl.textContent = 'Vẫn sinh lời ✓';
            varEl.style.color = 'var(--neon-green)';
        } else {
            varEl.textContent = `-${fmtVND(Math.abs(varLoss))}`;
            varEl.style.color = 'var(--neon-alert)';
        }
    }

    if (mc?.max_sharpe?.sharpe != null) {
        document.getElementById('rm-sharpe').textContent = mc.max_sharpe.sharpe.toFixed(2);
    }

    if (adv) {
        const mdd = adv.max_drawdown;
        if (mdd != null) {
            const mddPct = (mdd * 100).toFixed(2);
            document.getElementById('rm-mdd').textContent = mddPct + '%';
            document.getElementById('adv-mdd').textContent  = mddPct + '%';
            const warn = document.getElementById('rm-mdd-warn');
            if (Math.abs(mdd) > 0.2) {
                warn.textContent = t('risk_metric_mdd_warn');
                warn.style.color = 'var(--neon-alert)';
            } else {
                warn.textContent = t('risk_metric_mdd_ok');
                warn.style.color = 'var(--neon-green)';
            }

        }
        document.getElementById('adv-beta').textContent   = adv.beta?.toFixed(2)    ?? '--';
        document.getElementById('adv-sortino').textContent = adv.sortino?.toFixed(2)  ?? '--';
        document.getElementById('adv-treynor').textContent = adv.treynor?.toFixed(4)  ?? '--';
        document.getElementById('adv-rsq').textContent    = adv.r_squared?.toFixed(2) ?? '--';
        document.getElementById('adv-calmar').textContent  = adv.calmar?.toFixed(2)   ?? '--';
        document.getElementById('adv-metrics-card').style.display = 'block';
    }

    // Charts via Plotly
    if (data.chart) {
        document.getElementById('frontier-card').style.display = 'block';
        Plotly.react('frontier-chart', data.chart.data, {
            ...data.chart.layout,
            paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
            margin:{l:40,r:20,t:20,b:40}, font:{color:'#94A3B8'}
        }, { responsive:true, displayModeBar:false });
    }

    if (data.backtest_chart) {
        document.getElementById('backtest-card').style.display = 'block';
        Plotly.react('backtest-chart', data.backtest_chart.data, {
            ...data.backtest_chart.layout,
            paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
            margin:{l:40,r:20,t:20,b:40}, font:{color:'#94A3B8'}
        }, { responsive:true, displayModeBar:false });
    }

    if (data.pie_chart) {
        document.getElementById('allocation-card').style.display = 'block';
        Plotly.react('allocation-chart', data.pie_chart.data, {
            ...data.pie_chart.layout,
            paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)',
            margin:{l:20,r:20,t:20,b:20}, font:{color:'#94A3B8'},
            showlegend:true
        }, { responsive:true, displayModeBar:false });
    }

    // Trading signals
    if (data.trading_signals && Object.keys(data.trading_signals).length > 0) {
        document.getElementById('signals-card').style.display = 'block';
        const tbody = document.getElementById('signals-tbody');
        tbody.innerHTML = Object.entries(data.trading_signals).map(([ticker, sig]) => {
            let badgeClass = 'badge-hold';
            if (sig.action.includes('BUY'))  badgeClass = 'badge-buy';
            if (sig.action.includes('SELL')) badgeClass = 'badge-sell';
            return `
                <tr>
                    <td><span class="ticker-badge">${ticker}</span></td>
                    <td><span class="signal-badge ${badgeClass}">${sig.action}</span>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${sig.detail || ''}</div>
                    </td>
                    <td>${sig.volume?.toLocaleString('vi-VN') ?? '--'} CP @ ${fmtVND(sig.price)}</td>
                    <td class="text-right">
                        <a href="${sig.broker_url}" target="_blank" class="btn-vps-cta">Mở VPS ↗</a>
                    </td>
                </tr>`;
        }).join('');
    }

    // Prices table
    if (data.raw_prices) {
        document.getElementById('prices-card').style.display = 'block';
        if (data.last_updated_date) document.getElementById('prices-date').textContent = 'Cập nhật: ' + data.last_updated_date;
        document.getElementById('prices-tbody').innerHTML = Object.entries(data.raw_prices).map(([t,p]) =>
            `<tr><td><span class="ticker-badge">${t}</span></td><td class="text-right" style="color:var(--neon-green)">${fmtVND(p)}</td></tr>`
        ).join('');
    }

    // AI Advice streaming
    streamAIAdvice(data);

    // Scroll to results
    document.getElementById('risk-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function streamAIAdvice(data) {
    const panel   = document.getElementById('ai-panel');
    const textEl  = document.getElementById('ai-text');
    const loadEl  = document.getElementById('ai-loading');
    const badge   = document.getElementById('ai-status-badge');
    const badgeTxt= document.getElementById('ai-badge-text');

    panel.style.display = 'block';
    textEl.innerHTML    = '';
    loadEl.style.display= 'flex';
    badge.classList.remove('done');
    badgeTxt.textContent= t('ai_analyzing');


    try {
        const response = await fetchAIAdviceStream({
            monte_carlo:      data.monte_carlo,
            stress_test:      data.stress_test,
            advanced_metrics: data.advanced_metrics,
            news_data:        data.news_data || {},
            lang: AppState.currentLang || 'vi'
        });


        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        loadEl.style.display = 'none';

        const cursor = document.createElement('span');
        cursor.className = 'ai-cursor';
        textEl.appendChild(cursor);

        let full = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            full += decoder.decode(value, { stream: true });
            textEl.innerHTML = full
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g,     '<em>$1</em>')
                .replace(/\n/g,            '<br>');
            textEl.appendChild(cursor);
        }
        cursor.remove();
        badge.classList.add('done');
        badgeTxt.textContent = t('risk_ai_done');

        document.getElementById('btn-download-pdf').style.display = 'inline-block';

    } catch (err) {
        loadEl.style.display = 'none';
        textEl.innerHTML = `<span style="color:var(--neon-alert)">⚠️ Lỗi Gemini AI: ${err.message}</span>`;
    }
}

function showLoading(msg) {
    document.getElementById('risk-loading').style.display = 'flex';
    document.getElementById('risk-loading-text').textContent = msg;
    document.getElementById('risk-results').style.display = 'none';
}
function hideLoading() {
    document.getElementById('risk-loading').style.display = 'none';
}
function showError(msg) {
    const main = document.getElementById('risk-page');
    const existing = document.getElementById('risk-error-banner');
    if (existing) existing.remove();
    const banner = document.createElement('div');
    banner.id = 'risk-error-banner';
    banner.className = 'error-banner';
    banner.innerHTML = `⚠️ Lỗi kết nối backend: ${msg}<br><small>Đảm bảo FastAPI đang chạy: <code>uvicorn main:app --reload</code></small>`;
    main.insertBefore(banner, main.children[2]);
}
