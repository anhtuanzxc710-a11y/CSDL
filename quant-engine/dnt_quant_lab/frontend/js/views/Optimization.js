import { AppState } from '../state.js';
import { optimizeBlackLitterman, fetchAIAdviceStream } from '../api.js';
import { t } from '../i18n.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

function fmtPct(v, decimals = 2) { return v != null ? (v * 100).toFixed(decimals) + '%' : '--'; }

export function renderOptimization() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const today = new Date().toISOString().split('T')[0];
    const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

    main.innerHTML = `
    <div class="page-content" id="opt-page">
        <div class="page-header">
            <h1 class="page-title">⚖️ ${t('nav_opt_adv')}</h1>
            <div class="page-subtitle">${t('opt_subtitle')}</div>
        </div>

        <div class="two-col-grid" style="grid-template-columns: 1fr 1.5fr;">
            <!-- Left: Parameters -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3>${t('opt_params_title')}</h3>
                <div class="form-group">
                    <label>${t('opt_symbols')}</label>
                    <input type="text" id="opt-symbols" class="form-input" placeholder="VD: FPT, VCB, MWG" 
                        value="${AppState.portfolioHoldings.map(h => h.ticker).join(', ')}"/>
                </div>
                <div class="input-row">
                    <div class="form-group">
                        <label>${t('opt_start_date')}</label>
                        <input type="date" id="opt-start" class="form-input" value="${lastYear}"/>
                    </div>
                    <div class="form-group">
                        <label>${t('opt_end_date')}</label>
                        <input type="date" id="opt-end" class="form-input" value="${today}"/>
                    </div>
                </div>
                <div class="input-row">
                    <div class="form-group">
                        <label>${t('opt_tau')}</label>
                        <input type="number" id="opt-tau" class="form-input" value="0.05" step="0.01"/>
                    </div>
                    <div class="form-group">
                        <label>${t('opt_delta')}</label>
                        <input type="number" id="opt-delta" class="form-input" value="2.5" step="0.1"/>
                    </div>
                </div>
                <div class="form-group">
                    <label>${t('opt_rfr')}</label>
                    <input type="number" id="opt-rfr" class="form-input" value="3.0" step="0.1"/>
                </div>
                
                <button class="btn-primary" id="btn-run-opt" style="width: 100%; margin-top: 1rem;">${t('opt_btn_run')}</button>
            </div>

            <!-- Right: Views -->
            <div class="glass-card" style="padding: 1.5rem;">
                <div class="card-header" style="margin-bottom: 1rem;">
                    <h3>${t('opt_views_title')}</h3>
                    <button class="btn-ghost btn-sm" id="btn-add-view">${t('opt_add_view')}</button>
                </div>
                <div id="views-container" class="views-list">
                    <!-- Views will be added here -->
                </div>
            </div>
        </div>

        <!-- Loading Overlay -->
        <div id="opt-loading" style="display:none;" class="loading-overlay glass-card">
            <div class="loading-spinner"></div>
            <p>Đang tối ưu hóa danh mục Black-Litterman...</p>
        </div>

        <!-- Results -->
        <div id="opt-results" style="display:none; margin-top: 2rem;">
            <div class="stats-grid">
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('opt_metric_exp')}</div>
                    <div class="stat-value neon-green" id="res-exp">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('opt_metric_vol')}</div>
                    <div class="stat-value neon-blue" id="res-vol">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('opt_metric_sharpe')}</div>
                    <div class="stat-value" id="res-sharpe" style="color:#a78bfa">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">Dữ liệu mẫu (Observations)</div>
                    <div class="stat-value" id="res-obs" style="color:var(--text-muted)">--</div>
                </div>
            </div>

            <div class="two-col-grid" style="margin-top: 2rem;">
                <div class="glass-card chart-card">
                    <h3>${t('opt_result_weights')}</h3>
                    <div id="opt-weights-chart" style="height: 350px;"></div>
                </div>
                <div class="glass-card chart-card">
                    <h3>${t('opt_result_returns')}</h3>
                    <div id="opt-returns-chart" style="height: 350px;"></div>
                </div>
            </div>

            <div class="glass-card" style="margin-top: 2rem; padding: 1.5rem;">
                <h3>${t('opt_result_weights')} (Table)</h3>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('dash_col_ticker')}</th>
                                <th class="text-right">${t('dash_col_weight')} (%)</th>
                                <th class="text-right">${t('opt_prior')} (%)</th>
                                <th class="text-right">${t('opt_posterior')} (%)</th>
                            </tr>
                        </thead>
                        <tbody id="opt-table-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- AI Advice -->
            <div class="glass-card ai-advice-panel" id="opt-ai-panel" style="display:none; margin-top: 2rem;">
                <div class="ai-panel-title">
                    <span class="ai-gem-icon">✦</span>
                    <span>Tư vấn từ Gemini AI</span>
                    <div class="ai-badge" id="opt-ai-status">
                        <span class="ai-badge-dot"></span>
                        <span id="opt-ai-status-text">Đang phân tích...</span>
                    </div>
                </div>
                <div class="ai-divider"></div>
                <div class="ai-text" id="opt-ai-text"></div>
            </div>
        </div>
    </div>
    `;

    bindEvents();
    // Add one empty view by default
    addViewRow();
}

function addViewRow() {
    const container = document.getElementById('views-container');
    const row = document.createElement('div');
    row.className = 'view-row-card glass-card';
    row.innerHTML = `
        <div class="view-row-header">
            <input type="text" class="view-name form-input-sm" placeholder="${t('opt_view_name')}"/>
            <button class="btn-remove-view">✕</button>
        </div>
        <div class="view-row-body">
            <div class="form-group">
                <label>${t('opt_view_type')}</label>
                <select class="view-type form-input-sm">
                    <option value="absolute">${t('opt_type_abs')}</option>
                    <option value="relative">${t('opt_type_rel')}</option>
                </select>
            </div>
            <div class="form-group">
                <label>${t('opt_view_assets')}</label>
                <input type="text" class="view-assets form-input-sm" placeholder="VD: FPT,VCB"/>
            </div>
            <div class="form-group">
                <label>${t('opt_view_q')}</label>
                <input type="number" class="view-q form-input-sm" value="5" step="0.5"/>
            </div>
            <div class="form-group">
                <label>${t('opt_view_conf')}</label>
                <input type="number" class="view-conf form-input-sm" value="0.5" step="0.1" min="0.1" max="1.0"/>
            </div>
        </div>
    `;
    row.querySelector('.btn-remove-view').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function bindEvents() {
    document.getElementById('btn-add-view').addEventListener('click', addViewRow);
    document.getElementById('btn-run-opt').addEventListener('click', runOptimizationTask);
}

async function runOptimizationTask() {
    const symbolsRaw = document.getElementById('opt-symbols').value;
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    
    if (symbols.length < 2) {
        alert(AppState.currentLang === 'vi' ? 'Cần ít nhất 2 mã cổ phiếu.' : 'Need at least 2 symbols.');
        return;
    }

    const getNum = (id, def = 0) => {
        const val = parseFloat(document.getElementById(id).value);
        return isNaN(val) ? def : val;
    };

    const start = document.getElementById('opt-start').value;
    const end   = document.getElementById('opt-end').value;

    if (!start || !end) {
        alert(AppState.currentLang === 'vi' ? 'Vui lòng chọn ngày bắt đầu và kết thúc.' : 'Please select start and end dates.');
        return;
    }

    const payload = {
        symbols: symbols,
        start_date: start,
        end_date: end,
        interval: '1D',
        risk_free_rate: getNum('opt-rfr', 3.0) / 100,
        tau: getNum('opt-tau', 0.05),
        delta: getNum('opt-delta', 2.5),
        weight_min: 0,
        weight_max: 1.0,
        views: []
    };

    // Collect views
    let viewError = null;
    document.querySelectorAll('.view-row-card').forEach(row => {
        if (viewError) return;
        const assetsRaw = row.querySelector('.view-assets').value;
        const assets = assetsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (assets.length === 0) return;

        const type = row.querySelector('.view-type').value;
        if (type === 'absolute' && assets.length !== 1) {
            viewError = AppState.currentLang === 'vi' 
                ? `Quan điểm "Tuyệt đối" chỉ được chọn 1 mã (Bạn đang chọn: ${assets.join(', ')})`
                : `Absolute view must have exactly 1 asset (You selected: ${assets.join(', ')})`;
            return;
        }

        const qVal = parseFloat(row.querySelector('.view-q').value);
        const confVal = parseFloat(row.querySelector('.view-conf').value);

        payload.views.push({
            name: row.querySelector('.view-name').value || 'View',
            type: type,
            assets: assets,
            q: isNaN(qVal) ? 0 : qVal / 100,
            confidence: isNaN(confVal) ? 0.5 : Math.max(0.01, Math.min(1, confVal))
        });
    });

    if (viewError) {
        alert(viewError);
        return;
    }

    const loading = document.getElementById('opt-loading');
    const results = document.getElementById('opt-results');
    
    loading.style.display = 'flex';
    results.style.display = 'none';

    try {
        const data = await optimizeBlackLitterman(payload);
        displayResults(data);
        
        // Trigger AI Advice
        await getAIAdvice(data);
    } catch (err) {
        alert('Lỗi tối ưu hóa: ' + err.message);
    } finally {
        loading.style.display = 'none';
    }
}

async function getAIAdvice(data) {
    const panel = document.getElementById('opt-ai-panel');
    const textDiv = document.getElementById('opt-ai-text');
    const statusDiv = document.getElementById('opt-ai-status');
    const statusText = document.getElementById('opt-ai-status-text');

    panel.style.display = 'block';
    textDiv.innerHTML = '';
    statusDiv.classList.remove('done');
    statusText.textContent = 'Đang phân tích...';

    try {
        const response = await fetchAIAdviceStream({
            ...data,
            lang: AppState.currentLang
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            textDiv.innerHTML = marked.parse(fullText);
            textDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        
        statusDiv.classList.add('done');
        statusText.textContent = 'Hoàn tất';
    } catch (err) {
        textDiv.innerHTML = `<p class="neon-alert">⚠️ Lỗi Gemini AI: ${err.message}</p>`;
        statusText.textContent = 'Lỗi';
    }
}

function displayResults(data) {
    document.getElementById('opt-results').style.display = 'block';

    // Metrics
    document.getElementById('res-exp').textContent = fmtPct(data.expected_return);
    document.getElementById('res-vol').textContent = fmtPct(data.volatility);
    document.getElementById('res-sharpe').textContent = data.sharpe_ratio.toFixed(2);
    document.getElementById('res-obs').textContent = data.observations + ' ngày';

    // Weights Chart (Pie)
    const weightLabels = Object.keys(data.weights).filter(k => data.weights[k] > 0.001);
    const weightValues = weightLabels.map(k => data.weights[k]);
    
    Plotly.react('opt-weights-chart', [{
        values: weightValues,
        labels: weightLabels,
        type: 'pie',
        hole: 0.4,
        marker: { colors: ['#00FFAA', '#00B8FF', '#FF5555', '#F59E0B', '#8B5CF6', '#EC4899'] }
    }], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 20, r: 20, t: 20, b: 20 },
        font: { color: '#94A3B8' }
    }, { responsive: true, displayModeBar: false });

    // Returns Chart (Bar)
    const symbols = data.symbols;
    const prior = symbols.map(s => data.prior_returns[s] * 100);
    const posterior = symbols.map(s => data.posterior_returns[s] * 100);

    Plotly.react('opt-returns-chart', [
        { x: symbols, y: prior, name: t('opt_prior'), type: 'bar', marker: { color: '#94A3B8' } },
        { x: symbols, y: posterior, name: t('opt_posterior'), type: 'bar', marker: { color: '#00FFAA' } }
    ], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        barmode: 'group',
        yaxis: { title: 'Lợi nhuận (%)' }
    }, { responsive: true, displayModeBar: false });

    // Table
    const tbody = document.getElementById('opt-table-body');
    tbody.innerHTML = symbols.map(s => `
        <tr>
            <td><span class="ticker-badge">${s}</span></td>
            <td class="text-right" style="font-weight:600; color:var(--neon-green)">${(data.weights[s] * 100).toFixed(2)}%</td>
            <td class="text-right">${(data.prior_returns[s] * 100).toFixed(2)}%</td>
            <td class="text-right">${(data.posterior_returns[s] * 100).toFixed(2)}%</td>
        </tr>
    `).join('');

    // Scroll to results
    document.getElementById('opt-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
