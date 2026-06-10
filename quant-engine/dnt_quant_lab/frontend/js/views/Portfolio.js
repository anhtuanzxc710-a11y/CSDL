import { AppState } from '../state.js';
import { PortfolioService } from '../services/portfolioService.js';
import { t } from '../i18n.js';

export async function renderPortfolio() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1 class="page-title">${t('nav_portfolio')}</h1>
                <div class="page-subtitle">${t('ptf_subtitle')}</div>
            </div>
            <div class="glass-card" style="padding:2rem; text-align:center; color:var(--text-muted);" id="ptf-loading">
                <div style="font-size:2rem;">⏳</div>
                <p style="margin-top:0.5rem;">${t('ptf_loading')}</p>
            </div>
            <div id="ptf-content"></div>
        </div>
    `;

    try {
        let portfolios = await PortfolioService.getPortfolios();
        if (!portfolios || portfolios.length === 0) {
            // Auto create default portfolio
            const p = await PortfolioService.createPortfolio(t('ptf_tx_buy') === 'Buy' ? 'Initial' : 'Khởi đầu', "My first portfolio");
            portfolios = [p];
        }

        const activePtf = portfolios.find(p => p.is_default) || portfolios[0];
        AppState.selectedPortfolioId = activePtf.id;
        AppState.portfolios = portfolios;

        const holdingsRes = await PortfolioService.getHoldings(activePtf.id);
        const holdingsMap = holdingsRes.map || {};
        const enriched = holdingsRes.items || [];
        
        // Update state so risk analysis can use it
        AppState.portfolioHoldings = enriched.map(item => ({
            ticker: item.ticker,
            qty: item.quantity,
            avgCost: item.avg_cost
        }));

        let totalInvested = 0, currentValue = 0, totalPnl = 0;
        enriched.forEach(h => {
            const invested = h.quantity * h.avg_cost;
            totalInvested += invested;
            currentValue += h.market_value;
            h.pnl = h.market_value - invested;
            h.pnlPct = invested ? (h.pnl / invested) * 100 : 0;
        });

        totalPnl = currentValue - totalInvested;
        const totalPnlPct = totalInvested ? (totalPnl / totalInvested) * 100 : 0;
        const pnlColor = totalPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-alert)';

        document.getElementById('ptf-loading').style.display = 'none';

        const content = document.getElementById('ptf-content');
        content.innerHTML = `
            <!-- Portfolio Selection -->
            <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color:var(--text-muted)">${t('ptf_current')}</strong> 
                    <select id="ptf-selector" class="form-input search-input" style="display:inline-block; width:auto; border-bottom: 2px solid var(--border);">
                        ${portfolios.map(p => `<option value="${p.id}" ${p.id === activePtf.id ? 'selected':''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <button class="btn-primary btn-sm" id="btn-add-tx" style="background:var(--neon-purple);">${t('ptf_btn_add_tx')}</button>
                    <button class="btn-primary btn-sm" id="btn-new-ptf">${t('ptf_btn_new_ptf')}</button>
                </div>
            </div>

            <!-- Summary Strip -->
            <div class="portfolio-summary-strip">
                <div class="ptf-stat">
                    <span class="ptf-stat-label">${t('ptf_stat_capital')}</span>
                    <span class="ptf-stat-val" style="color:#00B8FF">${fmtVND(totalInvested)}</span>
                </div>
                <div class="ptf-stat-divider"></div>
                <div class="ptf-stat">
                    <span class="ptf-stat-label">${t('ptf_stat_value')}</span>
                    <span class="ptf-stat-val" style="color:var(--neon-green)">${fmtVND(currentValue)}</span>
                </div>
                <div class="ptf-stat-divider"></div>
                <div class="ptf-stat">
                    <span class="ptf-stat-label">${t('ptf_stat_pnl')}</span>
                    <span class="ptf-stat-val" style="color:${pnlColor}">${totalPnl>=0?'+':''}${fmtVND(totalPnl)} (${totalPnlPct.toFixed(1)}%)</span>
                </div>
                <div class="ptf-stat-divider"></div>
                <div class="ptf-stat">
                    <span class="ptf-stat-label">${t('ptf_stat_count')}</span>
                    <span class="ptf-stat-val" style="color:#F59E0B">${enriched.length}</span>
                </div>
            </div>

            <!-- Add Tx Form (Hidden Config) -->
            <div id="tx-form-container" class="glass-card" style="display:none; padding:1.5rem; margin-bottom: 1rem;">
                <h3 style="margin-top:0;">${t('ptf_tx_title')}</h3>
                <form id="add-tx-form" style="display:flex; gap:1rem; align-items:flex-end; flex-wrap:wrap;">
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:120px;">
                        <label>${t('ptf_tx_type')}</label>
                        <select id="tx-type" class="form-input"><option value="BUY">${t('ptf_tx_buy')}</option><option value="SELL">${t('ptf_tx_sell')}</option></select>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:100px;">
                        <label>${t('ptf_tx_ticker')}</label>
                        <input type="text" id="tx-ticker" class="form-input" placeholder="FPT" required style="text-transform:uppercase"/>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:120px;">
                        <label>${t('ptf_tx_qty')}</label>
                        <input type="number" id="tx-qty" class="form-input" placeholder="100" required min="1"/>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
                        <label>${t('ptf_tx_price')} (VNĐ)</label>
                        <input type="number" id="tx-price" class="form-input" placeholder="105000" required min="1"/>
                    </div>
                    <button type="submit" class="btn-primary" id="btn-submit-tx">${t('ptf_tx_save')}</button>
                    <button type="button" class="btn-primary" id="btn-cancel-tx" style="background:transparent; border:1px solid var(--border);">${t('btn_cancel')}</button>
                    <div id="tx-error" class="auth-error" style="display:none; width:100%; margin-top:0.5rem;"></div>
                </form>
            </div>

            <!-- Search + Table -->
            <div class="glass-card" style="padding:1.5rem;">
                <div class="table-toolbar">
                    <input type="text" id="ptf-search" class="form-input search-input"
                        placeholder="${t('ptf_search_ph')}" style="max-width:280px;"/>
                    <a href="#/risk-analysis" class="btn-primary btn-sm">🔬 ${t('nav_risk')}</a>
                </div>

                <div class="table-wrapper" style="margin-top:1rem;">
                    <table class="data-table" id="portfolio-table">
                        <thead>
                            <tr>
                                <th>${t('dash_col_ticker')}</th>
                                <th class="text-right">${t('ptf_col_qty')}</th>
                                <th class="text-right">${t('ptf_col_cost')}</th>
                                <th class="text-right">${t('ptf_col_mprice')}</th>
                                <th class="text-right">${t('ptf_col_mval')}</th>
                                <th class="text-right">${t('dash_col_pnl')}</th>
                                <th class="text-right">${t('dash_col_weight')}</th>
                            </tr>
                        </thead>
                        <tbody id="portfolio-tbody">
                            ${renderRows(enriched)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Note -->
            <div class="info-note">
                ℹ️ ${t('ptf_search_ph') === '🔍 Search ticker...' ? 'Holdings are calculated from transactions (add new with "+ Add Transaction"). Prices are estimated from real-time data.' : 'Dữ liệu holdings được tính toán từ các giao dịch (thêm mới bằng nút \'+ Thêm giao dịch\'). Giá thị trường được tổng hợp từ dữ liệu thời gian thực.'}
            </div>
        `;


        // Search logic
        document.getElementById('ptf-search').addEventListener('input', (e) => {
            const q = e.target.value.toUpperCase();
            document.getElementById('portfolio-tbody').innerHTML =
                renderRows(enriched.filter(h => h.ticker.includes(q)));
        });

        // Portfolio Switch
        document.getElementById('ptf-selector').addEventListener('change', async (e) => {
            const pid = parseInt(e.target.value);
            await PortfolioService.setDefaultPortfolio(pid);
            renderPortfolio();
        });

        // Toggle form
        document.getElementById('btn-add-tx').addEventListener('click', () => {
            document.getElementById('tx-form-container').style.display = 'block';
        });
        document.getElementById('btn-cancel-tx').addEventListener('click', () => {
            document.getElementById('tx-form-container').style.display = 'none';
        });

        // Submit form
        document.getElementById('add-tx-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-tx');
            const errDiv = document.getElementById('tx-error');
            btn.disabled = true;
            btn.textContent = 'Đang lưu...';
            errDiv.style.display = 'none';

            const payload = {
                side: document.getElementById('tx-type').value,
                ticker: document.getElementById('tx-ticker').value.trim().toUpperCase(),
                quantity: parseFloat(document.getElementById('tx-qty').value),
                price: parseFloat(document.getElementById('tx-price').value),
                fee: 0
            };

            try {
                await PortfolioService.addTransaction(activePtf.id, payload);
                // Refresh list
                renderPortfolio();
            } catch (err) {
                errDiv.textContent = err.message || "Không thể lưu giao dịch";
                errDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Lưu lại';
            }
        });

        // Create new portfolio
        document.getElementById('btn-new-ptf').addEventListener('click', async () => {
            const pName = prompt("Nhập tên danh mục mới:");
            if (pName) {
                await PortfolioService.createPortfolio(pName, "");
                renderPortfolio();
            }
        });

    } catch (e) {
        console.error("Lỗi tải portfolio:", e);
        main.innerHTML += `<div class="auth-error glass-card" style="margin:2rem auto; max-width:500px;">Lỗi tải dữ liệu. Vui lòng đăng nhập lại.</div>`;
    }
}

function renderRows(rows) {
    if (rows.length === 0) {
        return `<tr><td colspan="7" style="text-align:center; padding: 2rem;">${t('ptf_empty')}</td></tr>`
    }

    return rows.map(h => `
        <tr>
            <td><span class="ticker-badge">${h.ticker}</span></td>
            <td class="text-right">${h.quantity.toLocaleString('vi-VN')}</td>
            <td class="text-right">${fmtVND(h.avg_cost)}</td>
            <td class="text-right">${fmtVND(h.market_price)}</td>
            <td class="text-right">${fmtVND(h.market_value)}</td>
            <td class="text-right">
                <span style="color:${h.pnl>=0?'var(--neon-green)':'var(--neon-alert)'}; font-weight:600;">
                    ${h.pnl>=0?'+':''}${fmtVND(h.pnl)}<br>
                    <small>(${h.pnlPct>=0?'+':''}${h.pnlPct.toFixed(2)}%)</small>
                </span>
            </td>
            <td class="text-right">
                <div class="weight-bar-wrap">
                    <div class="weight-bar" style="width:${Math.min(h.weight * 100,100).toFixed(0)}%"></div>
                    <span>${(h.weight * 100).toFixed(1)}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

function fmtVND(v) {
    return Math.floor(v).toLocaleString('vi-VN') + '₫';
}
