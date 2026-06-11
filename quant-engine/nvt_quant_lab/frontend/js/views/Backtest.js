import { AppState } from '../state.js';
import { runBacktest } from '../api.js';
import { t } from '../i18n.js';

function fmtPct(v, decimals = 2) {
    return v != null ? (v * 100).toFixed(decimals) + '%' : '--';
}

export function renderBacktest() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const today = new Date().toISOString().split('T')[0];
    const last5Years = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];

    const defaultTickers = AppState.portfolioHoldings && AppState.portfolioHoldings.length > 0
        ? AppState.portfolioHoldings.map(h => h.ticker).join(', ')
        : 'FPT, VCB, MWG';

    main.innerHTML = `
    <div class="page-content" id="backtest-page">
        <div class="page-header">
            <h1 class="page-title">⏱️ ${t('nav_backtest')}</h1>
            <div class="page-subtitle">Kiểm thử và mô phỏng hiệu suất danh mục đầu tư lịch sử</div>
        </div>

        <div class="two-col-grid" style="grid-template-columns: 1fr 1.8fr; gap: 1.5rem;">
            <!-- Left Panel: Configurations -->
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                <h3 style="margin-top: 0;">⚙️ Tham số Backtest</h3>
                
                <div class="form-group">
                    <label>Danh sách mã cổ phiếu</label>
                    <input type="text" id="backtest-symbols" class="form-input" placeholder="VD: FPT, VCB, MWG" 
                        value="${defaultTickers}"/>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Ngày bắt đầu</label>
                        <input type="date" id="backtest-start" class="form-input" value="${last5Years}"/>
                    </div>
                    <div class="form-group">
                        <label>Ngày kết thúc</label>
                        <input type="date" id="backtest-end" class="form-input" value="${today}"/>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Vốn ban đầu (VND)</label>
                        <input type="number" id="backtest-capital" class="form-input" value="100000000" step="10000000"/>
                    </div>
                    <div class="form-group">
                        <label>Lãi suất phi rủi ro (%)</label>
                        <input type="number" id="backtest-rfr" class="form-input" value="3.0" step="0.1"/>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Phương thức tỷ trọng</label>
                        <select id="backtest-weighting" class="form-input" style="background-color: var(--card-bg);">
                            <option value="equal_weight">Tỷ trọng đều (Equal-Weight)</option>
                            <option value="market_cap_placeholder">Theo vốn hóa (Market Cap Mock)</option>
                            <option value="custom_weight">Tùy chỉnh (Custom Weight)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tần suất tái cơ cấu</label>
                        <select id="backtest-frequency" class="form-input" style="background-color: var(--card-bg);">
                            <option value="monthly">Hàng tháng (Monthly)</option>
                            <option value="quarterly">Hàng quý (Quarterly)</option>
                            <option value="yearly">Hàng năm (Yearly)</option>
                            <option value="none">Mua & Nắm giữ (Hold Forever)</option>
                        </select>
                    </div>
                </div>

                <!-- Custom weights inputs container -->
                <div id="backtest-custom-weights-container" style="display: none; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Tỷ trọng tùy chỉnh (Tổng phải bằng 1.0)</label>
                    <div id="backtest-custom-weights-inputs" style="max-height: 200px; overflow-y: auto; padding-right: 0.5rem;">
                        <!-- Generated dynamically -->
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">
                    <div class="form-group">
                        <label>Phí giao dịch (bps)</label>
                        <input type="number" id="backtest-tx-cost" class="form-input" value="15" min="0" step="1"/>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">15 bps = 0.15%</span>
                    </div>
                    <div class="form-group">
                        <label>Trượt giá / Slippage (bps)</label>
                        <input type="number" id="backtest-slippage" class="form-input" value="10" min="0" step="1"/>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">10 bps = 0.10%</span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Benchmark so sánh</label>
                    <select id="backtest-benchmark" class="form-input" style="background-color: var(--card-bg);">
                        <option value="VN30">VN30 Index</option>
                        <option value="VNINDEX">VNINDEX</option>
                    </select>
                </div>

                <button class="btn-primary" id="btn-run-backtest" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem 1rem;">
                    🚀 Chạy Backtest Lịch sử
                </button>
            </div>

            <!-- Right Panel: Guide and results -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <!-- Guide card -->
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0;">💡 Hướng dẫn Backtesting</h3>
                    <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 0.75rem;">
                        Trình mô phỏng portfolio backtest lịch sử sử dụng dữ liệu thực tế đóng cửa hàng ngày để kiểm nghiệm chiến thuật của bạn trong quá khứ.
                    </p>
                    <ul style="color: var(--text-muted); margin-left: 1.25rem; line-height: 1.6; margin-bottom: 0;">
                        <li>Hỗ trợ tính chi tiết <strong>Phí giao dịch</strong> và <strong>Trượt giá (Slippage)</strong> trên mỗi giá trị giao dịch phát sinh.</li>
                        <li>Tự động thực thi hành động <strong>Tái cân bằng (Rebalance)</strong> để đưa danh mục về tỷ trọng mục tiêu theo tần suất đã chọn.</li>
                        <li>Đồng bộ hóa kết quả và so sánh trực quan với <strong>Benchmark (VN30 / VNINDEX)</strong>.</li>
                    </ul>
                </div>

                <!-- Status Overlay & Error State -->
                <div id="backtest-loading" style="display:none; padding: 2rem; text-align: center;" class="glass-card">
                    <div class="loading-spinner" style="margin: 0 auto 1rem auto;"></div>
                    <p id="backtest-loading-text" style="color: var(--neon-green);">Đang chạy mô phỏng backtest lịch sử...</p>
                </div>

                <div id="backtest-error" style="display:none;" class="glass-card">
                    <div style="padding: 1.5rem; border-left: 4px solid #FF5555;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem;">⚠️</span>
                            <h3 style="margin: 0; color: #FF5555;">Lỗi Backtest</h3>
                        </div>
                        <p id="backtest-error-message" style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1rem;"></p>
                        <button class="btn-primary" id="btn-retry-backtest" style="background: linear-gradient(135deg, #FF5555, #FF8888);">
                            🔄 Thử lại
                        </button>
                    </div>
                </div>

                <!-- Warning degraded mode -->
                <div id="backtest-degraded-banner" style="display:none;" class="glass-card">
                    <div style="padding: 1rem 1.5rem; border-left: 4px solid #F59E0B; background: rgba(245, 158, 11, 0.05); display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.25rem;">⚠️</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #F59E0B;">Chế độ Degraded (Không có Benchmark)</div>
                            <div id="backtest-degraded-text" style="font-size: 0.85rem; color: var(--text-muted);">Dữ liệu benchmark không khả dụng.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Meta info bar -->
        <div class="glass-card" id="backtest-meta-bar" style="display:none; padding: 0.75rem 1.5rem; margin-top: 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-muted); gap: 1rem;">
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <span id="bmeta-benchmark">📊 Benchmark: --</span>
                <span id="bmeta-time">⏱️ -- ms</span>
            </div>
            <span id="bmeta-request-id" style="font-family: monospace;">🔗 --</span>
        </div>

        <!-- Results Block -->
        <div id="backtest-results" style="display:none; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Export & Title -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin: 0; color: var(--neon-green);">📊 Kết quả mô phỏng Backtest</h2>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn-secondary" id="btn-backtest-export-json">📥 Xuất JSON</button>
                    <button class="btn-secondary" id="btn-backtest-export-csv">📥 Xuất CSV (Excel)</button>
                </div>
            </div>

            <!-- Stats grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Tỷ suất lợi nhuận</div>
                    <div id="bres-total-return" style="font-size: 1.75rem; font-weight: 700; color: var(--neon-green);">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Lợi nhuận năm (CAGR)</div>
                    <div id="bres-ann-return" style="font-size: 1.75rem; font-weight: 700; color: var(--neon-green);">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Độ biến động năm</div>
                    <div id="bres-vol" style="font-size: 1.75rem; font-weight: 700; color: #E11D48;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Sharpe Ratio</div>
                    <div id="bres-sharpe" style="font-size: 1.75rem; font-weight: 700; color: #00B8FF;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Max Drawdown</div>
                    <div id="bres-mdd" style="font-size: 1.75rem; font-weight: 700; color: #FF5555;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Giá trị cuối cùng</div>
                    <div id="bres-final-val" style="font-size: 1.35rem; font-weight: 700; color: #F59E0B; word-break: break-all;">--</div>
                </div>
            </div>

            <!-- Charts grid -->
            <div class="two-col-grid" style="grid-template-columns: 1.5fr 1fr; gap: 1.5rem;">
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">📈 Tăng trưởng vốn đầu tư (Equity Curve)</h3>
                    <div id="backtest-equity-chart" style="height: 350px; width: 100%;"></div>
                </div>
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">📉 Sụt giảm tài sản lịch sử (Drawdown)</h3>
                    <div id="backtest-drawdown-chart" style="height: 350px; width: 100%;"></div>
                </div>
            </div>

            <!-- More Metrics Table & Cost summary -->
            <div class="two-col-grid" style="grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
                
                <!-- Metrics Table -->
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">📊 Chỉ số phân tích chi tiết</h3>
                    <div style="overflow-x: auto;">
                        <table class="data-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <th style="padding: 0.5rem 1rem 0.5rem 0;">Chỉ số</th>
                                    <th style="padding: 0.5rem; text-align: right;">Giá trị</th>
                                </tr>
                            </thead>
                            <tbody id="backtest-metrics-body">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Cost Summary and Rebalances summary -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Costs Card -->
                    <div class="glass-card" style="padding: 1.5rem;">
                        <h3 style="margin-top: 0; margin-bottom: 1rem;">💰 Chi tiết chi phí phát sinh</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-muted);">Tổng phí giao dịch:</span>
                                <span id="bres-cost-tx" style="font-weight: 600;">--</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-muted);">Tổng phí trượt giá (Slippage):</span>
                                <span id="bres-cost-slip" style="font-weight: 600;">--</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; font-weight: 700;">
                                <span style="color: var(--neon-green);">Tổng chi phí:</span>
                                <span id="bres-cost-total" style="color: var(--neon-green);">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Rebalance count card -->
                    <div class="glass-card" style="padding: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin: 0;">🔄 Tái cơ cấu (Rebalances)</h3>
                            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; margin-bottom: 0;">Số lần thực thi cân bằng lại danh mục</p>
                        </div>
                        <div id="bres-rebal-count" style="font-size: 2rem; font-weight: 700; color: #8B5CF6;">0</div>
                    </div>
                </div>
            </div>

            <!-- Rebalance Events log -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">📋 Nhật ký tái cơ cấu danh mục</h3>
                <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem; color: var(--text-muted);">
                                <th style="padding: 0.5rem 1rem;">Ngày</th>
                                <th style="padding: 0.5rem 1rem;">Giá trị Portfolio</th>
                                <th style="padding: 0.5rem 1rem;">Phí GD (VND)</th>
                                <th style="padding: 0.5rem 1rem;">Trượt giá (VND)</th>
                                <th style="padding: 0.5rem 1rem;">Số GD</th>
                                <th style="padding: 0.5rem 1rem;">Tỷ trọng phân bổ</th>
                            </tr>
                        </thead>
                        <tbody id="backtest-events-body" style="font-size: 0.9rem;">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
    `;

    bindEvents();
    updateCustomWeightsFields();
}

let lastBacktestData = null;

function bindEvents() {
    const runBtn = document.getElementById('btn-run-backtest');
    if (runBtn) {
        runBtn.addEventListener('click', runBacktestTask);
    }

    const retryBtn = document.getElementById('btn-retry-backtest');
    if (retryBtn) {
        retryBtn.addEventListener('click', runBacktestTask);
    }

    const symbolsInput = document.getElementById('backtest-symbols');
    const weightingSelect = document.getElementById('backtest-weighting');

    if (symbolsInput) {
        symbolsInput.addEventListener('input', updateCustomWeightsFields);
    }
    if (weightingSelect) {
        weightingSelect.addEventListener('change', updateCustomWeightsFields);
    }

    const exportJsonBtn = document.getElementById('btn-backtest-export-json');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (!lastBacktestData) return;
            const blob = new Blob([JSON.stringify(lastBacktestData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "portfolio_backtest_results.json");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const exportCsvBtn = document.getElementById('btn-backtest-export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (!lastBacktestData || !lastBacktestData.series) return;
            const series = lastBacktestData.series;

            // UTF-8 BOM for Excel compatibility
            let csvContent = "\uFEFFDate,Portfolio Value,Benchmark Value,Drawdown,Daily Return\n";

            for (let i = 0; i < series.dates.length; i++) {
                const date = series.dates[i];
                const portVal = series.equity_curve[i];
                const benchVal = series.benchmark_curve ? series.benchmark_curve[i] : '';
                const dd = series.drawdown[i];
                const ret = series.daily_returns[i];

                csvContent += `${date},${portVal},${benchVal},${dd},${ret}\n`;
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "portfolio_backtest_performance.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

function updateCustomWeightsFields() {
    const method = document.getElementById('backtest-weighting').value;
    const container = document.getElementById('backtest-custom-weights-container');
    const inputArea = document.getElementById('backtest-custom-weights-inputs');

    if (!container || !inputArea) return;

    if (method !== 'custom_weight') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    const symbolsRaw = document.getElementById('backtest-symbols').value;
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (symbols.length === 0) {
        inputArea.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Vui lòng nhập danh sách mã cổ phiếu trước.</p>`;
        return;
    }

    const equalW = (1.0 / symbols.length).toFixed(4);
    let html = '';
    symbols.forEach(s => {
        html += `
            <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem;">
                <span class="ticker-badge" style="width: 80px; text-align: center; font-size: 0.85rem; font-weight: 700; background: rgba(0, 255, 170, 0.1); color: var(--neon-green); border: 1px solid rgba(0, 255, 170, 0.2); padding: 0.25rem 0.5rem; border-radius: 4px;">${s}</span>
                <input type="number" class="form-input custom-weight-input" data-ticker="${s}" value="${equalW}" step="0.01" min="0" max="1" style="flex: 1; text-align: right; padding: 0.35rem 0.75rem;" />
            </div>
        `;
    });
    inputArea.innerHTML = html;
}

async function runBacktestTask() {
    const symbolsRaw = document.getElementById('backtest-symbols').value;
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (symbols.length === 0) {
        showBacktestError(AppState.currentLang === 'vi' ? 'Vui lòng nhập ít nhất 1 mã cổ phiếu.' : 'Please enter at least 1 stock symbol.');
        return;
    }

    const start = document.getElementById('backtest-start').value;
    const end = document.getElementById('backtest-end').value;

    if (!start || !end) {
        showBacktestError(AppState.currentLang === 'vi' ? 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.' : 'Please select both start and end dates.');
        return;
    }

    const capital = parseFloat(document.getElementById('backtest-capital').value) || 100000000;
    const rfr = (parseFloat(document.getElementById('backtest-rfr').value) || 3.0) / 100.0;
    const weighting = document.getElementById('backtest-weighting').value;
    const frequency = document.getElementById('backtest-frequency').value;
    const txCost = parseFloat(document.getElementById('backtest-tx-cost').value) || 0;
    const slippage = parseFloat(document.getElementById('backtest-slippage').value) || 0;
    const benchmark = document.getElementById('backtest-benchmark').value;

    let weights = null;
    if (weighting === 'custom_weight') {
        weights = {};
        const inputs = document.querySelectorAll('.custom-weight-input');
        let sum = 0;
        inputs.forEach(input => {
            const ticker = input.getAttribute('data-ticker');
            const val = parseFloat(input.value) || 0;
            weights[ticker] = val;
            sum += val;
        });

        if (Math.abs(sum - 1.0) > 1e-3) {
            showBacktestError(AppState.currentLang === 'vi'
                ? `Tổng tỷ trọng tùy chỉnh phải bằng 1.0 (Hiện tại: ${sum.toFixed(4)})`
                : `Total custom weights must sum to 1.0 (Current: ${sum.toFixed(4)})`);
            return;
        }
    }

    const loading = document.getElementById('backtest-loading');
    const results = document.getElementById('backtest-results');
    const errorCard = document.getElementById('backtest-error');
    const degradedBanner = document.getElementById('backtest-degraded-banner');
    const metaBar = document.getElementById('backtest-meta-bar');

    // Reset UI states
    loading.style.display = 'block';
    results.style.display = 'none';
    errorCard.style.display = 'none';
    degradedBanner.style.display = 'none';
    metaBar.style.display = 'none';

    try {
        const payload = {
            symbols: symbols,
            start_date: start,
            end_date: end,
            initial_capital: capital,
            weighting_method: weighting,
            rebalance_frequency: frequency,
            transaction_cost_bps: txCost,
            slippage_bps: slippage,
            benchmark: benchmark,
            risk_free_rate: rfr,
            weights: weights
        };

        const data = await runBacktest(payload);

        if (data.success === false) {
            throw new Error(data.message || 'Lỗi không xác định.');
        }

        lastBacktestData = data;
        AppState.lastBacktestResult = data;

        // Show degraded mode warning if applicable
        if (data._meta && data.warnings && data.warnings.length > 0) {
            degradedBanner.style.display = 'block';
            const degradedText = document.getElementById('backtest-degraded-text');
            if (degradedText) {
                degradedText.textContent = data.warnings[0];
            }
        }

        // Show meta info bar
        if (data._meta) {
            metaBar.style.display = 'flex';
            const bmEl = document.getElementById('bmeta-benchmark');
            const timeEl = document.getElementById('bmeta-time');
            const reqEl = document.getElementById('bmeta-request-id');
            if (bmEl) bmEl.textContent = `📊 Benchmark: ${data.strategy.benchmark || '--'}`;
            if (timeEl) timeEl.textContent = `⏱️ ${data._meta.execution_time_ms || '--'} ms`;
            if (reqEl) reqEl.textContent = `🔗 ${data._meta.request_id || '--'}`;
        }

        displayBacktestResults(data);
    } catch (err) {
        showBacktestError(err.message);
    } finally {
        loading.style.display = 'none';
    }
}

function showBacktestError(message) {
    const errorCard = document.getElementById('backtest-error');
    const errorMsg = document.getElementById('backtest-error-message');
    const loading = document.getElementById('backtest-loading');

    if (loading) loading.style.display = 'none';
    if (errorCard) {
        errorCard.style.display = 'block';
        if (errorMsg) {
            errorMsg.textContent = message;
        }
    }
}

function displayBacktestResults(data) {
    const results = document.getElementById('backtest-results');
    results.style.display = 'flex';

    const metrics = data.metrics;

    // Stats cards
    document.getElementById('bres-total-return').textContent = fmtPct(metrics.total_return);
    document.getElementById('bres-ann-return').textContent = fmtPct(metrics.annualized_return);
    document.getElementById('bres-vol').textContent = fmtPct(metrics.annualized_volatility);
    document.getElementById('bres-sharpe').textContent = metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '--';
    document.getElementById('bres-mdd').textContent = fmtPct(metrics.max_drawdown);
    document.getElementById('bres-final-val').textContent = metrics.final_value.toLocaleString('vi-VN') + ' VND';

    // Cost summary
    document.getElementById('bres-cost-tx').textContent = data.costs.total_transaction_costs.toLocaleString('vi-VN') + ' VND';
    document.getElementById('bres-cost-slip').textContent = data.costs.total_slippage_costs.toLocaleString('vi-VN') + ' VND';
    document.getElementById('bres-cost-total').textContent = data.costs.total_costs.toLocaleString('vi-VN') + ' VND';

    // Rebalance count
    document.getElementById('bres-rebal-count').textContent = data.rebalance_events.length;

    // Charts
    const dates = data.series.dates;
    const portfolioCurve = data.series.equity_curve;
    const benchmarkCurve = data.series.benchmark_curve;

    // 1. Equity Curve Plotly Chart
    const traces = [
        {
            x: dates,
            y: portfolioCurve,
            type: 'scatter',
            mode: 'lines',
            name: 'Danh mục (Portfolio)',
            line: { color: '#00FFAA', width: 2.5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(0, 255, 170, 0.03)'
        }
    ];

    if (benchmarkCurve && benchmarkCurve.length > 0) {
        traces.push({
            x: dates,
            y: benchmarkCurve,
            type: 'scatter',
            mode: 'lines',
            name: `Benchmark (${data.strategy.benchmark})`,
            line: { color: '#3B82F6', width: 1.5, dash: 'dash' }
        });
    }

    Plotly.react('backtest-equity-chart', traces, {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 70, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        yaxis: { title: 'Giá trị tài sản (VND)', tickformat: ',.0f' },
        legend: { orientation: 'h', y: -0.15 }
    }, { responsive: true, displayModeBar: false });

    // 2. Drawdown Plotly Chart
    const drawdownPercent = data.series.drawdown.map(v => v * 100);
    Plotly.react('backtest-drawdown-chart', [
        {
            x: dates,
            y: drawdownPercent,
            type: 'scatter',
            mode: 'lines',
            name: 'Sụt giảm (Drawdown)',
            line: { color: '#EF4444', width: 1.5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(239, 68, 68, 0.08)'
        }
    ], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        yaxis: { title: 'Sụt giảm (%)', range: [Math.min(...drawdownPercent) - 2, 0.5] }
    }, { responsive: true, displayModeBar: false });

    // Populate Detailed Metrics Table
    const metricsBody = document.getElementById('backtest-metrics-body');

    const details = [
        { name: "Lợi nhuận gộp (Total Return)", value: fmtPct(metrics.total_return) },
        { name: "Lợi nhuận kép năm (CAGR)", value: fmtPct(metrics.annualized_return) },
        { name: "Độ biến động năm (Volatility)", value: fmtPct(metrics.annualized_volatility) },
        { name: "Tỷ số Sharpe (Sharpe Ratio)", value: metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '--' },
        { name: "Tỷ số Sortino (Sortino Ratio)", value: metrics.sortino_ratio != null ? metrics.sortino_ratio.toFixed(2) : '--' },
        { name: "Sụt giảm tối đa (Max Drawdown)", value: fmtPct(metrics.max_drawdown) },
        { name: "Tỷ số Calmar (Calmar Ratio)", value: metrics.calmar_ratio != null ? metrics.calmar_ratio.toFixed(2) : '--' },
        { name: "Hệ số Beta (vs Benchmark)", value: metrics.beta != null ? metrics.beta.toFixed(2) : '--' },
        { name: "Hệ số Alpha (Jensen's Alpha)", value: metrics.alpha != null ? fmtPct(metrics.alpha) : '--' },
        { name: "Sai số bám sát (Tracking Error)", value: metrics.tracking_error != null ? fmtPct(metrics.tracking_error) : '--' },
        { name: "Tỷ số Thông tin (Information Ratio)", value: metrics.information_ratio != null ? metrics.information_ratio.toFixed(2) : '--' },
        { name: "Tỷ lệ ngày thắng (Win Rate)", value: fmtPct(metrics.win_rate) },
        { name: "Ngày tốt nhất (Best Day)", value: fmtPct(metrics.best_day) },
        { name: "Ngày xấu nhất (Worst Day)", value: fmtPct(metrics.worst_day) }
    ];

    metricsBody.innerHTML = details.map(row => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
            <td style="padding: 0.5rem 0.5rem 0.5rem 0; color: var(--text-muted); font-size: 0.9rem;">${row.name}</td>
            <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${row.value}</td>
        </tr>
    `).join('');

    // Populate Rebalance Events Log
    const eventsBody = document.getElementById('backtest-events-body');
    if (data.rebalance_events && data.rebalance_events.length > 0) {
        eventsBody.innerHTML = data.rebalance_events.map(ev => {
            // Weights formatting
            const weightsFormatted = Object.entries(ev.new_weights)
                .map(([ticker, w]) => `${ticker}: ${(w * 100).toFixed(0)}%`)
                .join(', ');

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 0.5rem 1rem; font-weight: 600;">${ev.date}</td>
                    <td style="padding: 0.5rem 1rem;">${ev.portfolio_value.toLocaleString('vi-VN')} VND</td>
                    <td style="padding: 0.5rem 1rem;">${ev.transaction_cost.toLocaleString('vi-VN')} VND</td>
                    <td style="padding: 0.5rem 1rem;">${ev.slippage_cost.toLocaleString('vi-VN')} VND</td>
                    <td style="padding: 0.5rem 1rem; text-align: center;"><span class="status-badge" style="background: rgba(139, 92, 246, 0.1); color: #8B5CF6; font-size: 0.8rem; padding: 0.2rem 0.4rem; border-radius: 4px;">${ev.trades_count}</span></td>
                    <td style="padding: 0.5rem 1rem; color: var(--text-muted); font-size: 0.8rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${weightsFormatted}">${weightsFormatted}</td>
                </tr>
            `;
        }).join('');
    } else {
        eventsBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Không có sự kiện tái cơ cấu nào phát sinh.</td>
            </tr>
        `;
    }

    // Smooth Scroll to Results
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
