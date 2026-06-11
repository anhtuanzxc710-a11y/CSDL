import { AppState } from '../state.js';
import { runOptimize, runOptimizeAndBacktest } from '../api.js';
import { t } from '../i18n.js';

function fmtPct(v, decimals = 2) {
    return v != null ? (v * 100).toFixed(decimals) + '%' : '--';
}

export function renderOptimizer() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const today = new Date().toISOString().split('T')[0];
    const last5Years = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];

    const defaultTickers = AppState.portfolioHoldings && AppState.portfolioHoldings.length > 0
        ? AppState.portfolioHoldings.map(h => h.ticker).join(', ')
        : 'FPT, VCB, MWG, HPG, TCB';

    main.innerHTML = `
    <div class="page-content" id="optimizer-page">
        <div class="page-header">
            <h1 class="page-title">⚖️ ${t('nav_optimizer_advanced')}</h1>
            <div class="page-subtitle">Tối ưu hóa phân bổ tỷ trọng danh mục dựa trên lý thuyết hiện đại (MPT)</div>
        </div>

        <div class="two-col-grid" style="grid-template-columns: 1fr 1.8fr; gap: 1.5rem;">
            <!-- Left Panel: Form Parameters -->
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                <h3 style="margin-top: 0;">⚙️ Tham số Tối ưu hóa</h3>
                
                <div class="form-group">
                    <label>Danh sách mã cổ phiếu</label>
                    <input type="text" id="optimizer-symbols" class="form-input" placeholder="VD: FPT, VCB, MWG" 
                        value="${defaultTickers}"/>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Ngày bắt đầu</label>
                        <input type="date" id="optimizer-start" class="form-input" value="${last5Years}"/>
                    </div>
                    <div class="form-group">
                        <label>Ngày kết thúc</label>
                        <input type="date" id="optimizer-end" class="form-input" value="${today}"/>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Vốn ban đầu (VND)</label>
                        <input type="number" id="optimizer-capital" class="form-input" value="100000000" step="10000000"/>
                    </div>
                    <div class="form-group">
                        <label>Lãi suất phi rủi ro (%)</label>
                        <input type="number" id="optimizer-rfr" class="form-input" value="3.0" step="0.1"/>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Phương pháp tối ưu</label>
                        <select id="optimizer-method" class="form-input" style="background-color: var(--card-bg);">
                            <option value="max_sharpe">Tối đa Sharpe Ratio (Max Sharpe)</option>
                            <option value="min_variance">Tối thiểu hóa biến động (Min Variance)</option>
                            <option value="risk_parity">Cân bằng rủi ro (Risk Parity)</option>
                            <option value="mean_variance">Lợi nhuận - Rủi ro (Mean-Variance Utility)</option>
                            <option value="equal_weight">Tỷ trọng đều (Equal Weight)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Hiệp phương sai</label>
                        <select id="optimizer-covariance" class="form-input" style="background-color: var(--card-bg);">
                            <option value="sample">Mẫu (Sample Covariance)</option>
                            <option value="ledoit_wolf">Ledoit-Wolf Shrinkage</option>
                        </select>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">
                    <div class="form-group">
                        <label>Tỷ trọng tối thiểu (Min)</label>
                        <input type="number" id="optimizer-min-weight" class="form-input" value="0.0" min="0" max="1" step="0.05"/>
                    </div>
                    <div class="form-group">
                        <label>Tỷ trọng tối đa (Max)</label>
                        <input type="number" id="optimizer-max-weight" class="form-input" value="1.0" min="0" max="1" step="0.05"/>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 1rem;">
                    <div class="form-group">
                        <label>Tần suất tái cơ cấu (Backtest)</label>
                        <select id="optimizer-rebalance" class="form-input" style="background-color: var(--card-bg);">
                            <option value="monthly">Hàng tháng</option>
                            <option value="quarterly">Hàng quý</option>
                            <option value="yearly">Hàng năm</option>
                            <option value="none">Mua & Nắm giữ</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Benchmark</label>
                        <select id="optimizer-benchmark" class="form-input" style="background-color: var(--card-bg);">
                            <option value="VN30">VN30 Index</option>
                            <option value="VNINDEX">VNINDEX</option>
                        </select>
                    </div>
                </div>

                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Phí giao dịch (bps)</label>
                        <input type="number" id="optimizer-tx-cost" class="form-input" value="15" min="0" step="1"/>
                    </div>
                    <div class="form-group">
                        <label>Trượt giá (bps)</label>
                        <input type="number" id="optimizer-slippage" class="form-input" value="10" min="0" step="1"/>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem;">
                    <button class="btn-primary" id="btn-run-optimize" style="width: 100%; padding: 0.75rem 1rem;">
                        📊 Chạy Tối ưu hóa tỷ trọng
                    </button>
                    <button class="btn-primary" id="btn-optimize-backtest" style="width: 100%; padding: 0.75rem 1rem; background: linear-gradient(135deg, #8B5CF6, #EC4899);">
                        🚀 Tối ưu hóa & Chạy Backtest
                    </button>
                </div>
            </div>

            <!-- Right Panel: Info and Results -->
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Guidelines -->
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0;">💡 Lý thuyết Phân bổ Danh mục</h3>
                    <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 0.75rem;">
                        Modern Portfolio Theory (MPT) tối ưu hóa tỷ lệ lợi nhuận kỳ vọng trên mỗi đơn vị rủi ro (độ biến động).
                    </p>
                    <ul style="color: var(--text-muted); margin-left: 1.25rem; line-height: 1.6; margin-bottom: 0;">
                        <li><strong>Min Variance</strong>: Tạo danh mục có tổng độ biến động thấp nhất có thể.</li>
                        <li><strong>Max Sharpe</strong>: Tối đa hóa tỷ lệ Sharpe so với Benchmark phi rủi ro.</li>
                        <li><strong>Risk Parity</strong>: Phân bổ sao cho đóng góp rủi ro của mỗi tài sản bằng nhau.</li>
                        <li><strong>Ledoit-Wolf Shrinkage</strong>: Thu hẹp ma trận hiệp phương sai mẫu, tăng độ ổn định của lời giải.</li>
                    </ul>
                </div>

                <!-- Status Screen -->
                <div id="optimizer-loading" style="display:none; padding: 2rem; text-align: center;" class="glass-card">
                    <div class="loading-spinner" style="margin: 0 auto 1rem auto;"></div>
                    <p id="optimizer-loading-text" style="color: var(--neon-green);">Đang giải bài toán tối ưu hóa tỷ trọng danh mục...</p>
                </div>

                <!-- Error Board -->
                <div id="optimizer-error" style="display:none;" class="glass-card">
                    <div style="padding: 1.5rem; border-left: 4px solid #FF5555;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.5rem;">⚠️</span>
                            <h3 style="margin: 0; color: #FF5555;">Không thể giải tối ưu hóa</h3>
                        </div>
                        <p id="optimizer-error-message" style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1rem;"></p>
                    </div>
                </div>

                <!-- Warning Degradation Banner -->
                <div id="optimizer-degraded-banner" style="display:none;" class="glass-card">
                    <div style="padding: 1rem 1.5rem; border-left: 4px solid #F59E0B; background: rgba(245, 158, 11, 0.05); display: flex; align-items: center; gap: 1rem;">
                        <span style="font-size: 1.25rem;">⚠️</span>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #F59E0B;">Cảnh báo tối ưu hóa</div>
                            <div id="optimizer-degraded-text" style="font-size: 0.85rem; color: var(--text-muted);">Lỗi giải thuật hoặc Ledoit-Wolf được thu hồi về sample covariance.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Meta Information Area -->
        <div class="glass-card" id="optimizer-meta-bar" style="display:none; padding: 0.75rem 1.5rem; margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: var(--text-muted); gap: 1rem;">
            <div style="display: flex; gap: 1.5rem;">
                <span id="ometa-method">📊 Phương pháp: --</span>
                <span id="ometa-time">⏱️ -- ms</span>
            </div>
            <span id="ometa-request-id" style="font-family: monospace;">🔗 --</span>
        </div>

        <!-- Block 1: Optimizer Output Results (only shown after optimization run) -->
        <div id="optimizer-results" style="display:none; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin: 0; color: var(--neon-green);">🎯 Tỷ trọng tối ưu hóa khuyến nghị</h2>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn-secondary" id="btn-opt-export-json">📥 Xuất JSON</button>
                    <button class="btn-secondary" id="btn-opt-export-csv">📥 Xuất CSV</button>
                </div>
            </div>

            <!-- Stats grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Lợi nhuận năm kỳ vọng</div>
                    <div id="ores-return" style="font-size: 1.75rem; font-weight: 700; color: var(--neon-green);">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Độ biến động năm kỳ vọng</div>
                    <div id="ores-vol" style="font-size: 1.75rem; font-weight: 700; color: #E11D48;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Tỷ số Sharpe dự phóng</div>
                    <div id="ores-sharpe" style="font-size: 1.75rem; font-weight: 700; color: #00B8FF;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Tỷ số Diversification</div>
                    <div id="ores-div" style="font-size: 1.75rem; font-weight: 700; color: #8B5CF6;">--</div>
                </div>
            </div>

            <!-- Charts: Frontier and Allocation -->
            <div class="two-col-grid" style="grid-template-columns: 1.3fr 1fr; gap: 1.5rem;">
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">📈 Đường biên hiệu quả (Efficient Frontier)</h3>
                    <div id="opt-frontier-chart" style="height: 380px; width: 100%;"></div>
                </div>
                <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem;">🥧 Tỷ trọng phân bổ danh mục</h3>
                    <div id="opt-alloc-chart" style="height: 250px; width: 100%;"></div>
                    <div style="overflow-x: auto; margin-top: 1rem; flex: 1;">
                        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;">
                                    <th style="padding: 0.4rem;">Mã CP</th>
                                    <th style="padding: 0.4rem; text-align: right;">Tỷ trọng</th>
                                    <th style="padding: 0.4rem; text-align: right;">Đóng góp rủi ro (VND)</th>
                                </tr>
                            </thead>
                            <tbody id="opt-weights-tbody">
                                <!-- Generated -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Risk Contribution Chart -->
            <div class="glass-card" id="opt-risk-contribution-card" style="display: none; padding: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">📊 Đóng góp rủi ro cận biên (Risk Contribution)</h3>
                <div id="opt-risk-chart" style="height: 300px; width: 100%;"></div>
            </div>
        </div>

        <!-- Block 2: Backtest Comparison Result (only shown after Optimize & Backtest run) -->
        <div id="opt-backtest-results" style="display:none; margin-top: 2rem; display: flex; flex-direction: column; gap: 1.5rem; border-top: 2px dashed rgba(255, 255, 255, 0.05); padding-top: 2rem;">
            <h2 style="margin: 0; color: #8B5CF6;">⏱️ Kết quả mô phỏng Backtest danh mục tối ưu</h2>

            <!-- Stats grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Tỷ suất lợi nhuận thực tế</div>
                    <div id="opt-bt-total-return" style="font-size: 1.75rem; font-weight: 700; color: var(--neon-green);">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">CAGR thực tế</div>
                    <div id="opt-bt-ann-return" style="font-size: 1.75rem; font-weight: 700; color: var(--neon-green);">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Độ biến động thực tế</div>
                    <div id="opt-bt-vol" style="font-size: 1.75rem; font-weight: 700; color: #E11D48;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Sharpe Ratio thực tế</div>
                    <div id="opt-bt-sharpe" style="font-size: 1.75rem; font-weight: 700; color: #00B8FF;">--</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Sụt giảm tối đa (MDD)</div>
                    <div id="opt-bt-mdd" style="font-size: 1.75rem; font-weight: 700; color: #FF5555;">--</div>
                </div>
            </div>

            <!-- Chart -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">📈 Hiệu suất lịch sử danh mục tối ưu so với Benchmark</h3>
                <div id="opt-bt-equity-chart" style="height: 380px; width: 100%;"></div>
            </div>
        </div>

    </div>
    `;

    bindEvents();
}

let lastOptData = null;

function bindEvents() {
    const runOptBtn = document.getElementById('btn-run-optimize');
    if (runOptBtn) {
        runOptBtn.addEventListener('click', () => runTask('optimize'));
    }

    const runOptBtBtn = document.getElementById('btn-optimize-backtest');
    if (runOptBtBtn) {
        runOptBtBtn.addEventListener('click', () => runTask('optimize-and-backtest'));
    }

    // JSON export
    const exportJsonBtn = document.getElementById('btn-opt-export-json');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
            if (!lastOptData) return;
            const blob = new Blob([JSON.stringify(lastOptData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "portfolio_optimization_results.json");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // CSV export
    const exportCsvBtn = document.getElementById('btn-opt-export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (!lastOptData) return;

            // Determine structure based on whether optimizer is top-level (from /optimize) or inside combined /optimize-and-backtest
            const optSection = lastOptData.optimizer ? lastOptData.optimizer : lastOptData;

            let csvContent = "\uFEFFSymbol,Weight,Risk Contribution\n";
            const weights = optSection.weights;
            const rc = optSection.risk_contribution || {};

            Object.keys(weights).forEach(sym => {
                csvContent += `${sym},${weights[sym]},${rc[sym] || 0}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "portfolio_optimized_weights.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

async function runTask(actionType) {
    const symbolsRaw = document.getElementById('optimizer-symbols').value;
    const symbols = symbolsRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    if (symbols.length === 0) {
        showError('Vui lòng nhập ít nhất 1 mã cổ phiếu.');
        return;
    }

    const start = document.getElementById('optimizer-start').value;
    const end = document.getElementById('optimizer-end').value;

    if (!start || !end) {
        showError('Vui lòng nhập đầy đủ khoảng thời gian.');
        return;
    }

    const capital = parseFloat(document.getElementById('optimizer-capital').value) || 100000000;
    const rfr = (parseFloat(document.getElementById('optimizer-rfr').value) || 3.0) / 100;
    const method = document.getElementById('optimizer-method').value;
    const cov = document.getElementById('optimizer-covariance').value;
    const minW = parseFloat(document.getElementById('optimizer-min-weight').value);
    const maxW = parseFloat(document.getElementById('optimizer-max-weight').value);
    const benchmark = document.getElementById('optimizer-benchmark').value;
    const rebalance = document.getElementById('optimizer-rebalance').value;
    const txCost = parseFloat(document.getElementById('optimizer-tx-cost').value) || 0;
    const slippage = parseFloat(document.getElementById('optimizer-slippage').value) || 0;

    if (isNaN(minW) || isNaN(maxW) || minW < 0 || maxW > 1.0 || minW > maxW) {
        showError('Tỷ trọng ràng buộc không hợp lệ. Đảm bảo: 0 <= Min <= Max <= 1.0.');
        return;
    }

    const loading = document.getElementById('optimizer-loading');
    const results = document.getElementById('optimizer-results');
    const backtestBlock = document.getElementById('opt-backtest-results');
    const errorCard = document.getElementById('optimizer-error');
    const degradedBanner = document.getElementById('optimizer-degraded-banner');
    const metaBar = document.getElementById('optimizer-meta-bar');

    loading.style.display = 'block';
    results.style.display = 'none';
    backtestBlock.style.display = 'none';
    errorCard.style.display = 'none';
    degradedBanner.style.display = 'none';
    metaBar.style.display = 'none';

    try {
        const payload = {
            symbols: symbols,
            start_date: start,
            end_date: end,
            initial_capital: capital,
            optimizer: method,
            risk_free_rate: rfr,
            constraints: {
                long_only: true,
                min_weight: minW,
                max_weight: maxW
            },
            covariance_method: cov,
            benchmark: benchmark
        };

        if (actionType === 'optimize') {
            const data = await runOptimize(payload);
            if (data.success === false) throw new Error(data.message || 'Lỗi không xác định.');

            lastOptData = data;
            AppState.lastOptimizerResult = data;

            if (data.warnings && data.warnings.length > 0) {
                degradedBanner.style.display = 'block';
                document.getElementById('optimizer-degraded-text').textContent = data.warnings.join(' | ');
            }

            showMetaBar(data, method);
            displayOptimizationResults(data);
        } else {
            // Tối ưu hóa & Chạy Backtest kết hợp
            const btPayload = {
                ...payload,
                rebalance_frequency: rebalance,
                transaction_cost_bps: txCost,
                slippage_bps: slippage
            };
            const data = await runOptimizeAndBacktest(btPayload);
            if (data.success === false) throw new Error(data.message || 'Lỗi không xác định.');

            lastOptData = data;
            AppState.lastOptimizerResult = data.optimizer || data;
            if (data.backtest) {
                AppState.lastBacktestResult = data.backtest;
            }

            if (data.optimizer.warnings && data.optimizer.warnings.length > 0) {
                degradedBanner.style.display = 'block';
                document.getElementById('optimizer-degraded-text').textContent = data.optimizer.warnings.join(' | ');
            }

            showMetaBar(data, method);
            displayOptimizationResults(data.optimizer);
            displayBacktestResults(data.backtest);
        }

    } catch (err) {
        showError(err.message);
    } finally {
        loading.style.display = 'none';
    }
}

function showError(message) {
    const errorCard = document.getElementById('optimizer-error');
    const errorMsg = document.getElementById('optimizer-error-message');
    const loading = document.getElementById('optimizer-loading');
    if (loading) loading.style.display = 'none';
    if (errorCard) {
        errorCard.style.display = 'block';
        errorMsg.textContent = message;
    }
}

function showMetaBar(data, method) {
    const metaBar = document.getElementById('optimizer-meta-bar');
    metaBar.style.display = 'flex';
    document.getElementById('ometa-method').textContent = `📊 Phương pháp: ${method.toUpperCase()} (${data.covariance_method || data.optimizer?.covariance_method})`;
    document.getElementById('ometa-time').textContent = `⏱️ ${data._meta?.execution_time_ms || '--'} ms`;
    document.getElementById('ometa-request-id').textContent = `🔗 ${data._meta?.request_id || '--'}`;
}

function displayOptimizationResults(optData) {
    const results = document.getElementById('optimizer-results');
    results.style.display = 'flex';

    const metrics = optData.metrics;

    // Stat cards
    document.getElementById('ores-return').textContent = fmtPct(metrics.expected_return);
    document.getElementById('ores-vol').textContent = fmtPct(metrics.volatility);
    document.getElementById('ores-sharpe').textContent = metrics.sharpe_ratio.toFixed(2);
    document.getElementById('ores-div').textContent = metrics.diversification_ratio.toFixed(2);

    // Weights table
    const weightsBody = document.getElementById('opt-weights-tbody');
    const symbols = Object.keys(optData.weights);

    weightsBody.innerHTML = symbols.map(s => {
        const w = optData.weights[s];
        const rc = optData.risk_contribution ? optData.risk_contribution[s] : 0.0;
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 0.4rem;"><span class="ticker-badge" style="background: rgba(0, 255, 170, 0.1); color: var(--neon-green); padding: 0.2rem 0.4rem; border-radius: 4px; font-weight:700;">${s}</span></td>
                <td style="padding: 0.4rem; text-align: right; font-weight:600;">${fmtPct(w)}</td>
                <td style="padding: 0.4rem; text-align: right; color: var(--text-muted);">${rc.toLocaleString('vi-VN')} VND</td>
            </tr>
        `;
    }).join('');

    // Chart 1: Allocation Pie
    Plotly.react('opt-alloc-chart', [{
        values: Object.values(optData.weights),
        labels: Object.keys(optData.weights),
        type: 'pie',
        hole: 0.4,
        marker: { colors: ['#00FFAA', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981', '#14B8A6'] }
    }], {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 20, r: 20, t: 20, b: 20 },
        font: { color: '#94A3B8' }
    }, { responsive: true, displayModeBar: false });

    // Chart 2: Efficient Frontier Plotly Scatter
    const frontierPoints = optData.efficient_frontier;
    if (frontierPoints && frontierPoints.length > 0) {
        const xVols = frontierPoints.map(p => p.volatility * 100);
        const yRets = frontierPoints.map(p => p.target_return * 100);

        Plotly.react('opt-frontier-chart', [
            {
                x: xVols,
                y: yRets,
                mode: 'lines+markers',
                type: 'scatter',
                name: 'Efficient Frontier',
                line: { color: '#8B5CF6', width: 2 },
                marker: { size: 4, color: '#A78BFA' }
            },
            {
                x: [metrics.volatility * 100],
                y: [metrics.expected_return * 100],
                mode: 'markers',
                type: 'scatter',
                name: 'Selected Optimal Portfolio',
                marker: { size: 12, color: '#00FFAA', symbol: 'star' }
            }
        ], {
            template: 'plotly_dark',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 50, r: 20, t: 20, b: 40 },
            font: { color: '#94A3B8' },
            xaxis: { title: 'Độ biến động kỳ vọng (%)' },
            yaxis: { title: 'Lợi nhuận kỳ vọng (%)' },
            legend: { orientation: 'h', y: -0.2 }
        }, { responsive: true, displayModeBar: false });
    }

    // Chart 3: Risk Contributions Bar
    const riskCard = document.getElementById('opt-risk-contribution-card');
    if (optData.risk_contribution && optData.optimizer === 'risk_parity') {
        riskCard.style.display = 'block';
        const rcVals = Object.values(optData.risk_contribution);
        const rcLabels = Object.keys(optData.risk_contribution);
        Plotly.react('opt-risk-chart', [{
            x: rcLabels,
            y: rcVals,
            type: 'bar',
            marker: { color: '#3B82F6' }
        }], {
            template: 'plotly_dark',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: { l: 50, r: 20, t: 20, b: 40 },
            font: { color: '#94A3B8' },
            yaxis: { title: 'Risk Contribution (VND)' }
        }, { responsive: true, displayModeBar: false });
    } else {
        riskCard.style.display = 'none';
    }

    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayBacktestResults(btData) {
    const backtestBlock = document.getElementById('opt-backtest-results');
    backtestBlock.style.display = 'flex';

    const metrics = btData.metrics;

    // Stats cards
    document.getElementById('opt-bt-total-return').textContent = fmtPct(metrics.total_return);
    document.getElementById('opt-bt-ann-return').textContent = fmtPct(metrics.annualized_return);
    document.getElementById('opt-bt-vol').textContent = fmtPct(metrics.annualized_volatility);
    document.getElementById('opt-bt-sharpe').textContent = metrics.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '--';
    document.getElementById('opt-bt-mdd').textContent = fmtPct(metrics.max_drawdown);

    // Chart
    const dates = btData.series.dates;
    const portfolioCurve = btData.series.equity_curve;
    const benchmarkCurve = btData.series.benchmark_curve;

    const traces = [
        {
            x: dates,
            y: portfolioCurve,
            type: 'scatter',
            mode: 'lines',
            name: 'Danh mục tối ưu (Optimized Portfolio)',
            line: { color: '#8B5CF6', width: 2.5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(139, 92, 246, 0.03)'
        }
    ];

    if (benchmarkCurve && benchmarkCurve.length > 0) {
        traces.push({
            x: dates,
            y: benchmarkCurve,
            type: 'scatter',
            mode: 'lines',
            name: `Benchmark (${btData.strategy.benchmark})`,
            line: { color: '#3B82F6', width: 1.5, dash: 'dash' }
        });
    }

    Plotly.react('opt-bt-equity-chart', traces, {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 70, r: 20, t: 20, b: 40 },
        font: { color: '#94A3B8' },
        yaxis: { title: 'Giá trị tài sản (VND)', tickformat: ',.0f' },
        legend: { orientation: 'h', y: -0.15 }
    }, { responsive: true, displayModeBar: false });
}
