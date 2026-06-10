import { AppState } from '../state.js';
import { PortfolioService } from '../services/portfolioService.js';
import { t } from '../i18n.js';

let editingTxId = null;
let editingHoldingTicker = null;

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
        
        let transactions = [];
        try {
            transactions = await PortfolioService.getTransactions(activePtf.id);
        } catch (txErr) {
            console.error("Lỗi tải lịch sử giao dịch:", txErr);
        }
        
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
            <div id="tx-form-container" class="glass-card" style="display:${editingTxId ? 'block' : 'none'}; padding:1.5rem; margin-bottom: 1rem; border-color:${editingTxId ? 'var(--neon-purple)' : 'var(--border)'};">
                <h3 style="margin-top:0;">${editingTxId ? t('ptf_tx_edit_title') : t('ptf_tx_title')}</h3>
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
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
                        <label>Ngày GD</label>
                        <input type="date" id="tx-date" class="form-input"/>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:120px;">
                        <label>Phí GD (VNĐ)</label>
                        <input type="number" id="tx-fee" class="form-input" placeholder="0" min="0" step="any"/>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1; min-width:120px;">
                        <label>Thuế GD (VNĐ)</label>
                        <input type="number" id="tx-tax" class="form-input" placeholder="0" min="0" step="any"/>
                    </div>
                    <div class="form-group" style="margin-bottom:0; flex:1.5; min-width:180px;">
                        <label>Ghi chú</label>
                        <input type="text" id="tx-note" class="form-input" placeholder="Ghi chú giao dịch..."/>
                    </div>
                    <button type="submit" class="btn-primary" id="btn-submit-tx" style="${editingTxId ? 'background:var(--neon-purple); color:var(--bg);' : ''}">
                        ${editingTxId ? t('ptf_tx_update_btn') : t('ptf_tx_save')}
                    </button>
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
                                <th style="text-align: center; width: 120px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="portfolio-tbody">
                            ${renderRows(enriched)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Transaction History Card -->
            <div class="glass-card" style="padding:1.5rem; margin-top:1.5rem;">
                <div class="card-header" style="margin-bottom: 1rem;">
                    <h3>${t('ptf_tx_history')}</h3>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('ptf_tx_type')}</th>
                                <th>${t('dash_col_ticker')}</th>
                                <th class="text-right">${t('ptf_tx_qty')}</th>
                                <th class="text-right">${t('ptf_tx_price')}</th>
                                <th class="text-right">Tổng giá trị</th>
                                <th class="text-right">Phí / Thuế</th>
                                <th>Ngày giao dịch</th>
                                <th>Ghi chú</th>
                                <th style="text-align: center; width: 150px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderTxRows(transactions)}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Note -->
            <div class="info-note">
                ℹ️ ${t('ptf_search_ph') === '🔍 Search ticker...' ? 'Holdings are calculated from transactions (add new with "+ Add Transaction"). Prices are estimated from real-time data.' : 'Dữ liệu holdings được tính toán từ các giao dịch (thêm mới bằng nút \'+ Thêm giao dịch\'). Giá thị trường được tổng hợp từ dữ liệu thời gian thực.'}
            </div>
        `;

        // Pre-fill form if editing
        if (editingTxId) {
            const txToEdit = transactions.find(t => t.id === editingTxId);
            if (txToEdit) {
                document.getElementById('tx-type').value = txToEdit.side;
                document.getElementById('tx-ticker').value = txToEdit.ticker;
                document.getElementById('tx-qty').value = txToEdit.quantity;
                document.getElementById('tx-price').value = txToEdit.price;
                if (txToEdit.trade_date) {
                    document.getElementById('tx-date').value = txToEdit.trade_date.split('T')[0];
                }
                document.getElementById('tx-fee').value = txToEdit.fee !== undefined ? txToEdit.fee : 0;
                document.getElementById('tx-tax').value = txToEdit.tax !== undefined ? txToEdit.tax : 0;
                document.getElementById('tx-note').value = txToEdit.note || '';
            }
        }

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
        document.getElementById('btn-add-tx').addEventListener('click', async () => {
            editingTxId = null;
            await renderPortfolio();
            const container = document.getElementById('tx-form-container');
            if (container) {
                container.style.display = 'block';
            }
        });
        document.getElementById('btn-cancel-tx').addEventListener('click', async () => {
            editingTxId = null;
            await renderPortfolio();
        });

        // Submit form
        document.getElementById('add-tx-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-tx');
            const errDiv = document.getElementById('tx-error');
            btn.disabled = true;
            btn.textContent = editingTxId ? t('ptf_tx_update_btn') + '...' : t('ptf_tx_save') + '...';
            errDiv.style.display = 'none';

            const dateVal = document.getElementById('tx-date').value;
            const payload = {
                side: document.getElementById('tx-type').value,
                ticker: document.getElementById('tx-ticker').value.trim().toUpperCase(),
                quantity: parseFloat(document.getElementById('tx-qty').value),
                price: parseFloat(document.getElementById('tx-price').value),
                fee: parseFloat(document.getElementById('tx-fee').value) || 0,
                tax: parseFloat(document.getElementById('tx-tax').value) || 0,
                trade_date: dateVal ? new Date(dateVal).toISOString() : null,
                note: document.getElementById('tx-note').value.trim() || null
            };

            try {
                if (editingTxId) {
                    await PortfolioService.updateTransaction(activePtf.id, editingTxId, payload);
                    editingTxId = null;
                } else {
                    await PortfolioService.addTransaction(activePtf.id, payload);
                }
                // Refresh list
                renderPortfolio();
            } catch (err) {
                errDiv.textContent = err.message || (editingTxId ? "Không thể cập nhật giao dịch" : "Không thể lưu giao dịch");
                errDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = editingTxId ? t('ptf_tx_update_btn') : t('ptf_tx_save');
            }
        });

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit-tx').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const txId = parseInt(e.currentTarget.getAttribute('data-id'));
                editingTxId = txId;
                await renderPortfolio();
                const container = document.getElementById('tx-form-container');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Bind Delete buttons
        document.querySelectorAll('.btn-delete-tx').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const txId = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm(t('ptf_confirm_delete'))) {
                    try {
                        await PortfolioService.deleteTransaction(activePtf.id, txId);
                        if (editingTxId === txId) {
                            editingTxId = null;
                        }
                        renderPortfolio();
                    } catch (err) {
                        alert(err.message || "Không thể xóa giao dịch");
                    }
                }
            });
        });

        // Bind Edit Holding buttons
        document.querySelectorAll('.btn-edit-holding').forEach(btn => {
            btn.addEventListener('click', (e) => {
                editingHoldingTicker = e.currentTarget.getAttribute('data-ticker');
                renderPortfolio();
            });
        });

        // Bind Cancel Holding buttons
        document.querySelectorAll('.btn-cancel-holding').forEach(btn => {
            btn.addEventListener('click', () => {
                editingHoldingTicker = null;
                renderPortfolio();
            });
        });

        // Bind Save Holding buttons
        document.querySelectorAll('.btn-save-holding').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const ticker = e.currentTarget.getAttribute('data-ticker');
                const qtyVal = parseFloat(document.getElementById('edit-holding-qty').value);
                const costVal = parseFloat(document.getElementById('edit-holding-cost').value);
                
                if (isNaN(qtyVal) || qtyVal < 0 || isNaN(costVal) || costVal < 0) {
                    alert("Khối lượng và Giá vốn phải là số lớn hơn hoặc bằng 0");
                    return;
                }
                
                e.currentTarget.disabled = true;
                e.currentTarget.textContent = "⌛...";
                
                try {
                    await PortfolioService.updateHolding(activePtf.id, ticker, qtyVal, costVal);
                    editingHoldingTicker = null;
                    renderPortfolio();
                } catch (err) {
                    alert(err.message || "Không thể cập nhật holdings");
                    e.currentTarget.disabled = false;
                    e.currentTarget.textContent = "💾 Lưu";
                }
            });
        });

        // Create new portfolio
        document.getElementById('btn-new-ptf').addEventListener('click', async () => {
            const pName = prompt("Nhập tên danh mục mới:");
            if (pName) {
                await PortfolioService.createPortfolio(pName, "");
                renderPortfolio();
            }
        });

        // Periodic auto-update for market values every 20 minutes
        async function updateMarketValues() {
            try {
                if (AppState.selectedPortfolioId !== activePtf.id) return;
                
                const holdingsRes = await PortfolioService.getHoldings(activePtf.id);
                const enriched = holdingsRes.items || [];
                
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

                const summaryStrip = document.querySelector('.portfolio-summary-strip');
                if (summaryStrip) {
                    summaryStrip.innerHTML = `
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
                    `;
                }

                const tbody = document.getElementById('portfolio-tbody');
                if (tbody) {
                    const searchInput = document.getElementById('ptf-search');
                    const q = searchInput ? searchInput.value.toUpperCase() : '';
                    tbody.innerHTML = renderRows(enriched.filter(h => h.ticker.includes(q)));
                }
                console.log("[Auto-Refresh] Đã tự động cập nhật giá thị trường thành công:", new Date().toLocaleTimeString());
            } catch (err) {
                console.error("[Auto-Refresh] Lỗi khi tự động cập nhật giá thị trường:", err);
            }
        }

        const refreshInterval = setInterval(updateMarketValues, 20 * 60 * 1000);

        return {
            cleanup: () => {
                clearInterval(refreshInterval);
                console.log("Đã dọn dẹp bộ tự động cập nhật giá thị trường (Portfolio Interval).");
            }
        };

    } catch (e) {
        console.error("Lỗi tải portfolio:", e);
        main.innerHTML += `<div class="auth-error glass-card" style="margin:2rem auto; max-width:500px;">Lỗi tải dữ liệu. Vui lòng đăng nhập lại.</div>`;
    }
}

function renderRows(rows) {
    if (rows.length === 0) {
        return `<tr><td colspan="8" style="text-align:center; padding: 2rem;">${t('ptf_empty')}</td></tr>`
    }

    return rows.map(h => {
        const isEditing = editingHoldingTicker === h.ticker;
        
        const qtyCell = isEditing 
            ? `<input type="number" id="edit-holding-qty" class="form-input text-right" value="${h.quantity}" style="width: 80px; display: inline-block; padding: 2px 6px; font-size: 0.85rem;" min="0" step="any"/>`
            : h.quantity.toLocaleString('vi-VN');
            
        const costCell = isEditing
            ? `<input type="number" id="edit-holding-cost" class="form-input text-right" value="${h.avg_cost}" style="width: 120px; display: inline-block; padding: 2px 6px; font-size: 0.85rem;" min="0" step="any"/>`
            : fmtVND(h.avg_cost);
            
        const actionCell = isEditing
            ? `<button class="btn-primary btn-sm btn-save-holding" data-ticker="${h.ticker}" style="padding: 2px 8px; font-size: 0.75rem; background: var(--neon-green); color: var(--bg); margin-right: 4px;">💾 Lưu</button>
               <button class="btn-ghost btn-sm btn-cancel-holding" style="padding: 2px 8px; font-size: 0.75rem;">❌ Hủy</button>`
            : `<button class="btn-ghost btn-sm btn-edit-holding" data-ticker="${h.ticker}" style="padding: 2px 8px; font-size: 0.75rem;">✏️ Sửa</button>`;

        return `
            <tr style="${isEditing ? 'background: rgba(0, 184, 255, 0.08);' : ''}">
                <td><span class="ticker-badge">${h.ticker}</span></td>
                <td class="text-right">${qtyCell}</td>
                <td class="text-right">${costCell}</td>
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
                <td style="text-align: center;">
                    ${actionCell}
                </td>
            </tr>
        `;
    }).join('');
}

function renderTxRows(transactions) {
    if (!transactions || transactions.length === 0) {
        return `<tr><td colspan="9" style="text-align:center; padding: 2rem; color:var(--text-muted);">${t('ptf_empty')}</td></tr>`;
    }
    return transactions.map(tx => {
        const sideBadge = tx.side === 'BUY' 
            ? `<span class="signal-badge badge-buy">${t('ptf_tx_buy')}</span>` 
            : `<span class="signal-badge badge-sell">${t('ptf_tx_sell')}</span>`;
            
        const totalVal = tx.quantity * tx.price;
        const feeStr = tx.fee ? fmtVND(tx.fee) : '0₫';
        const taxStr = tx.tax ? fmtVND(tx.tax) : '0₫';
        const dateStr = tx.trade_date ? tx.trade_date.split('T')[0] : '';
        const noteStr = tx.note || '-';
        
        return `
            <tr>
                <td>${sideBadge}</td>
                <td><span class="ticker-badge">${tx.ticker}</span></td>
                <td class="text-right">${tx.quantity.toLocaleString('vi-VN')}</td>
                <td class="text-right">${fmtVND(tx.price)}</td>
                <td class="text-right" style="font-weight:600; color:var(--text-main);">${fmtVND(totalVal)}</td>
                <td class="text-right" style="font-size:0.85rem; color:var(--text-muted);">${feeStr} / ${taxStr}</td>
                <td>${dateStr}</td>
                <td style="color:var(--text-muted); font-size:0.85rem; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${noteStr}">${noteStr}</td>
                <td style="text-align: center;">
                    <button class="btn-ghost btn-sm btn-edit-tx" data-id="${tx.id}" style="padding: 2px 8px; font-size: 0.75rem; margin-right: 4px;">✏️ ${t('ptf_tx_edit')}</button>
                    <button class="btn-alert btn-sm btn-delete-tx" data-id="${tx.id}" style="padding: 2px 8px; font-size: 0.75rem; background: rgba(255, 95, 86, 0.12); border-color: rgba(255, 95, 86, 0.3); color: var(--neon-alert);">🗑️ ${t('ptf_tx_delete')}</button>
                </td>
            </tr>
        `;
    }).join('');
}

function fmtVND(v) {
    return Math.floor(v).toLocaleString('vi-VN') + '₫';
}
