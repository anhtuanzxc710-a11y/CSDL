import { AppState } from '../state.js';
import { analyzeQuant } from '../api.js';
import { t } from '../i18n.js';

function fmtPct(v, decimals = 2) { return v != null ? (v * 100).toFixed(decimals) + '%' : '--'; }

export function renderQuant() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const today = new Date().toISOString().split('T')[0];
    const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

    // Mặc định lấy danh sách mã từ danh mục hiện tại nếu có
    const defaultTickers = AppState.portfolioHoldings && AppState.portfolioHoldings.length > 0
        ? AppState.portfolioHoldings.map(h => h.ticker).join(', ')
        : 'FPT, VCB, MWG';

    main.innerHTML = `
    <div class="page-content" id="quant-page">
        <div class="page-header">
            <h1 class="page-title">📈 ${t('nav_quant')}</h1>
            <div class="page-subtitle">${t('quant_subtitle')}</div>
        </div>

        <div class="two-col-grid" style="grid-template-columns: 1fr 1.5fr;">
            <!-- Left Panel: Parameters -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3>⚙️ ${t('opt_params_title')}</h3>
                <div class="form-group">
                    <label>${t('quant_tickers')}</label>
                    <input type="text" id="quant-symbols" class="form-input" placeholder="VD: FPT, VCB, MWG" 
                        value="${defaultTickers}"/>
                </div>
                <div class="input-row">
                    <div class="form-group">
                        <label>${t('quant_start_date')}</label>
                        <input type="date" id="quant-start" class="form-input" value="${lastYear}"/>
                    </div>
                    <div class="form-group">
                        <label>${t('quant_end_date')}</label>
                        <input type="date" id="quant-end" class="form-input" value="${today}"/>
                    </div>
                </div>
                <div class="input-row">
                    <div class="form-group">
                        <label>${t('quant_capital')}</label>
                        <input type="number" id="quant-capital" class="form-input" value="1000000000" step="10000000"/>
                    </div>
                    <div class="form-group">
                        <label>${t('quant_rfr')}</label>
                        <input type="number" id="quant-rfr" class="form-input" value="3.0" step="0.1"/>
                    </div>
                </div>
                
                <button class="btn-primary" id="btn-run-quant" style="width: 100%; margin-top: 1.5rem;">
                    ${t('quant_btn_analyze')}
                </button>
            </div>

            <!-- Right Panel: Overview and Help -->
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3>💡 Hướng dẫn sử dụng</h3>
                    <p style="color: var(--text-muted); margin-top: 0.5rem; line-height: 1.6;">
                        Module <strong>Quant App Core</strong> cho phép bạn chạy phân tích định lượng nhanh trên một danh mục cổ phiếu phân bổ đều (Equal-Weight).
                    </p>
                    <ul style="color: var(--text-muted); margin-left: 1.25rem; margin-top: 0.75rem; line-height: 1.6;">
                        <li>Nhập ít nhất 1 mã cổ phiếu hợp lệ trên thị trường chứng khoán Việt Nam (VD: FPT, VCB, HPG).</li>
                        <li>Chọn khoảng thời gian lịch sử để kiểm tra hiệu suất danh mục.</li>
                        <li>Hệ thống tự động đồng bộ giá đóng cửa và tính toán các chỉ số quản trị rủi ro như <strong>Sharpe Ratio</strong>, <strong>Max Drawdown</strong>, <strong>Beta</strong> so với thị trường chung (VN30).</li>
                    </ul>
                </div>
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem; margin-top: 1rem;">
                    <span style="font-size: 0.85rem; color: var(--neon-green);">✦ Phase 2: Production-Ready Infrastructure</span>
                </div>
            </div>
        </div>

        <!-- Phase 2: Loading Overlay with enhanced states -->
        <div id="quant-loading" style="display:none;" class="loading-overlay glass-card">
            <div class="loading-spinner"></div>
            <p id="quant-loading-text">${t('quant_loading')}</p>
        </div>

        <!-- Phase 2: Error Display Card (replaces alert) -->
        <div id="quant-error" style="display:none; margin-top: 1.5rem;" class="glass-card">
            <div style="padding: 1.5rem; border-left: 4px solid #FF5555;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <span style="font-size: 1.5rem;">⚠️</span>
                    <h3 style="margin: 0; color: #FF5555;">Lỗi phân tích</h3>
                </div>
                <p id="quant-error-message" style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1rem;"></p>
                <button class="btn-primary" id="btn-retry-quant" style="background: linear-gradient(135deg, #FF5555, #FF8888);">
                    🔄 Thử lại
                </button>
            </div>
        </div>

        <!-- Phase 2: Degraded Mode Warning Banner -->
        <div id="quant-degraded-banner" style="display:none; margin-top: 1.5rem;" class="glass-card">
            <div style="padding: 1rem 1.5rem; border-left: 4px solid #F59E0B; display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.25rem;">⚡</span>
                <div>
                    <strong style="color: #F59E0B;">Chế độ giảm cấp</strong>
                    <p id="quant-degraded-text" style="color: var(--text-muted); font-size: 0.85rem; margin: 0.25rem 0 0 0;">
                        Dữ liệu benchmark không khả dụng. Chỉ số Beta có thể không chính xác.
                    </p>
                </div>
            </div>
        </div>

        <!-- Results Section -->
        <div id="quant-results" style="display:none; margin-top: 2rem;">
            <div class="page-header" style="margin-bottom: 1rem;">
                <h2 class="page-title">${t('quant_results_title')}</h2>
                <div class="quant-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-ghost btn-sm" id="btn-export-json">💾 ${t('quant_export_json')}</button>
                    <button class="btn-ghost btn-sm" id="btn-export-csv">📄 ${t('quant_export_csv')}</button>
                </div>
            </div>

            <!-- Phase 2: Meta Info Bar -->
            <div id="quant-meta-bar" style="display:none; margin-bottom: 1rem; padding: 0.5rem 1rem; border-radius: 8px; background: rgba(0,255,170,0.05); border: 1px solid rgba(0,255,170,0.1); font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 1.5rem; align-items: center;">
                <span id="qmeta-benchmark">📊 Benchmark: --</span>
                <span id="qmeta-time">⏱️ -- ms</span>
                <span id="qmeta-request-id">🔗 --</span>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 2rem;">
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('quant_metric_return')}</div>
                    <div class="stat-value neon-green" id="qres-return">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('quant_metric_vol')}</div>
                    <div class="stat-value neon-blue" id="qres-vol">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('quant_metric_sharpe')}</div>
                    <div class="stat-value" id="qres-sharpe" style="color:#a78bfa">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('quant_metric_mdd')}</div>
                    <div class="stat-value neon-alert" id="qres-mdd">--</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-label">${t('quant_metric_beta')}</div>
                    <div class="stat-value" id="qres-beta" style="color:var(--text-muted)">--</div>
                </div>
            </div>

            <!-- Extended Stats Row -->
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 2rem; opacity: 0.9;">
                <div class="stat-card glass-card" style="padding: 1rem;">
                    <div class="stat-label" style="font-size:0.75rem">${t('quant_metric_sortino')}</div>
                    <div class="stat-value" id="qres-sortino" style="font-size:1.5rem; color:#f472b6">--</div>
                </div>
                <div class="stat-card glass-card" style="padding: 1rem;">
                    <div class="stat-label" style="font-size:0.75rem">${t('quant_metric_treynor')}</div>
                    <div class="stat-value" id="qres-treynor" style="font-size:1.5rem; color:#38bdf8">--</div>
                </div>
                <div class="stat-card glass-card" style="padding: 1rem;">
                    <div class="stat-label" style="font-size:0.75rem">${t('quant_metric_calmar')}</div>
                    <div class="stat-value" id="qres-calmar" style="font-size:1.5rem; color:#fb7185">--</div>
                </div>
            </div>

            <!-- Two Column Chart Section -->
            <div class="two-col-grid" style="margin-bottom: 2rem;">
                <div class="glass-card chart-card">
                    <h3>${t('quant_equity_curve')}</h3>
                    <div id="quant-equity-chart" style="height: 350px;"></div>
                </div>
                <div class="glass-card chart-card">
                    <h3>${t('quant_drawdown_chart')}</h3>
                    <div id="quant-drawdown-chart" style="height: 350px;"></div>
                </div>
            </div>

            <!-- Bottom Section: Allocation & Correlation -->
            <div class="two-col-grid" style="grid-template-columns: 1fr 1.5fr;">
                <div class="glass-card chart-card">
                    <h3>${t('quant_allocation')}</h3>
                    <div id="quant-alloc-chart" style="height: 350px;"></div>
                </div>
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3>${t('quant_correlation')}</h3>
                    <div class="table-wrapper" style="margin-top: 1rem;">
                        <table class="data-table">
                            <thead id="quant-corr-thead">
                                <!-- Generated Dynamically -->
                            </thead>
                            <tbody id="quant-corr-tbody">
                                <!-- Generated Dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    bindEvents();
}

let lastAnalysisData = null;

function bindEvents() {
    const runBtn = document.getElementById('btn-run-quant');
    if (runBtn) {
        runBtn.addEventListener('click', runQuantAnalysisTask);
    }

    // Phase 2: Retry button
    const retryBtn = document.getElementById('btn-retry-quant');
    if (retryBtn) {
        retryBtn.addEventListener('click', runQuantAnalysisTask);
    }

    const exportJsonBtn = document.getElementById('btn-export-json');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (!lastAnalysisData) return;
            const blob = new Blob([JSON.stringify(lastAnalysisData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "quant_analysis_results.json");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (!lastAnalysisData || !lastAnalysisData.charts) return;
            const charts = lastAnalysisData.charts;
            let csvContent = "\uFEFFDate,Equity Return,Drawdown\n"; // Add BOM for Excel UTF-8
            for (let i = 0; i < charts.dates.length; i++) {
                csvContent += `${charts.dates[i]},${charts.equity_curve[i]},${charts.drawdown[i]}\n`;
            }
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "quant_historical_performance.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

async function runQuantAnalysisTask() {
    const symbolsRaw = document.getElementById('quant-symbols').value;
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (symbols.length === 0) {
        showQuantError(AppState.currentLang === 'vi' ? 'Vui lòng nhập ít nhất 1 mã cổ phiếu.' : 'Please enter at least 1 stock symbol.');
        return;
    }

    const start = document.getElementById('quant-start').value;
    const end = document.getElementById('quant-end').value;

    if (!start || !end) {
        showQuantError(AppState.currentLang === 'vi' ? 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.' : 'Please select both start and end dates.');
        return;
    }

    const capital = parseFloat(document.getElementById('quant-capital').value) || 1000000000;
    const rfr = (parseFloat(document.getElementById('quant-rfr').value) || 3.0) / 100;

    const loading = document.getElementById('quant-loading');
    const loadingText = document.getElementById('quant-loading-text');
    const results = document.getElementById('quant-results');
    const errorCard = document.getElementById('quant-error');
    const degradedBanner = document.getElementById('quant-degraded-banner');

    // Reset UI states
    loading.style.display = 'flex';
    loadingText.textContent = t('quant_loading');
    results.style.display = 'none';
    errorCard.style.display = 'none';
    degradedBanner.style.display = 'none';

    try {
        const payload = {
            tickers: symbols,
            start_date: start,
            end_date: end,
            capital: capital,
            risk_free_rate: rfr
        };

        const data = await analyzeQuant(payload);

        // Phase 2: Handle standardized error response
        if (data.success === false) {
            throw new Error(data.message || 'Lỗi không xác định.');
        }
        if (data.error) {
            throw new Error(data.error);
        }

        lastAnalysisData = data;
        AppState.lastQuantResult = data;

        // Phase 2: Show degraded mode banner if applicable
        if (data._meta && data._meta.is_degraded) {
            degradedBanner.style.display = 'block';
            const degradedText = document.getElementById('quant-degraded-text');
            if (degradedText) {
                degradedText.textContent = AppState.currentLang === 'vi'
                    ? 'Dữ liệu benchmark không khả dụng. Chỉ số Beta được đặt mặc định = 1.0.'
                    : 'Benchmark data unavailable. Beta defaults to 1.0.';
            }
        }

        // Phase 2: Show meta info bar
        if (data._meta) {
            const metaBar = document.getElementById('quant-meta-bar');
            if (metaBar) {
                metaBar.style.display = 'flex';
                const bmEl = document.getElementById('qmeta-benchmark');
                const timeEl = document.getElementById('qmeta-time');
                const reqEl = document.getElementById('qmeta-request-id');
                if (bmEl) bmEl.textContent = `📊 Benchmark: ${data._meta.benchmark_source || '--'}`;
                if (timeEl) timeEl.textContent = `⏱️ ${data._meta.execution_time_ms || '--'} ms`;
                if (reqEl) reqEl.textContent = `🔗 ${data._meta.request_id || '--'}`;
            }
        }

        displayQuantResults(data);
    } catch (err) {
        // Phase 2: Show error card instead of alert
        showQuantError(err.message);
    } finally {
        loading.style.display = 'none';
    }
}

/**
 * Phase 2: Show error card with retry button instead of alert()
 */
function showQuantError(message) {
    const errorCard = document.getElementById('quant-error');
    const errorMsg = document.getElementById('quant-error-message');
    const loading = document.getElementById('quant-loading');

    if (loading) loading.style.display = 'none';
    if (errorCard) {
        errorCard.style.display = 'block';
        if (errorMsg) {
            errorMsg.textContent = message;
        }
    }
}

function displayQuantResults(data) {
    document.getElementById('quant-results').style.display = 'block';

    // 1. Stats Display
    const metrics = data.metrics;
    document.getElementById('qres-return').textContent = fmtPct(metrics.expected_return);
    document.getElementById('qres-vol').textContent = fmtPct(metrics.volatility);
    document.getElementById('qres-sharpe').textContent = metrics.sharpe_ratio.toFixed(2);
    document.getElementById('qres-mdd').textContent = fmtPct(metrics.max_drawdown);
    document.getElementById('qres-beta').textContent = metrics.beta.toFixed(2);

    document.getElementById('qres-sortino').textContent = metrics.sortino.toFixed(2);
    document.getElementById('qres-treynor').textContent = fmtPct(metrics.treynor);
    document.getElementById('qres-calmar').textContent = metrics.calmar.toFixed(2);

    // 2. Charts
    const dates = data.charts.dates;

    // 2.1 Equity Curve Chart
    const eqCurve = data.charts.equity_curve.map(v => v * 100); // % scale
    Plotly.react('quant-equity-chart', [{
        x: dates,
        y: eqCurve,
        type: 'scatter',
        mode: 'lines',
        name: 'Portfolio',
        line: { color: '#00FFAA', width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 255, 170, 0.05)'
    }], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        yaxis: { title: 'Tăng trưởng (%)' }
    }, { responsive: true, displayModeBar: false });

    // 2.2 Drawdown Chart
    const ddCurve = data.charts.drawdown.map(v => v * 100); // % scale
    Plotly.react('quant-drawdown-chart', [{
        x: dates,
        y: ddCurve,
        type: 'scatter',
        mode: 'lines',
        name: 'Drawdown',
        line: { color: '#FF5555', width: 1.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(255, 85, 85, 0.1)'
    }], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 40, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        yaxis: { title: 'Sụt giảm (%)', range: [Math.min(...ddCurve) - 2, 0.5] }
    }, { responsive: true, displayModeBar: false });

    // 2.3 Allocation Pie Chart
    const weightLabels = Object.keys(data.weights);
    const weightValues = Object.values(data.weights);
    Plotly.react('quant-alloc-chart', [{
        values: weightValues,
        labels: weightLabels,
        type: 'pie',
        hole: 0.4,
        marker: { colors: ['#00FFAA', '#00B8FF', '#FF5555', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6'] }
    }], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 20, r: 20, t: 20, b: 20 },
        font: { color: '#94A3B8' }
    }, { responsive: true, displayModeBar: false });

    // 3. Correlation Matrix Table
    const tickers = data.tickers;
    const thead = document.getElementById('quant-corr-thead');
    const tbody = document.getElementById('quant-corr-tbody');

    // Header
    thead.innerHTML = `
        <tr>
            <th></th>
            ${tickers.map(t => `<th class="text-center">${t}</th>`).join('')}
        </tr>
    `;

    // Body rows
    tbody.innerHTML = tickers.map(t1 => {
        return `
            <tr>
                <td style="font-weight:600;"><span class="ticker-badge">${t1}</span></td>
                ${tickers.map(t2 => {
            const val = data.correlation_matrix[t1][t2];
            let cellStyle = '';

            // Heatmap coloring: green for high correlation, neutral for low
            if (t1 === t2) {
                cellStyle = 'background-color: rgba(0, 255, 170, 0.15); font-weight: bold;';
            } else {
                const alpha = Math.abs(val) * 0.2;
                const color = val >= 0 ? `0, 255, 170, ${alpha}` : `255, 85, 85, ${alpha}`;
                cellStyle = `background-color: rgba(${color});`;
            }

            return `<td class="text-center" style="${cellStyle}">${val.toFixed(2)}</td>`;
        }).join('')}
            </tr>
        `;
    }).join('');

    // Smooth Scroll to Results
    document.getElementById('quant-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
