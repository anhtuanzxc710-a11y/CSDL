import { AppState }        from '../state.js';
import { getCurrentPrices } from '../api.js';
import { t }                from '../i18n.js';

export async function renderDashboard() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const holdings = AppState.portfolioHoldings;

    // Try to get live prices
    let prices = {};
    try {
        prices = await getCurrentPrices(holdings.map(h => h.ticker));
    } catch {
        // Fallback mock prices
        holdings.forEach(h => { prices[h.ticker] = h.avgCost * (1 + (Math.random() - 0.3) * 0.25); });
    }

    let totalInvested = 0, currentValue = 0;
    const enriched = holdings.map(h => {
        const invested = h.qty * h.avgCost;
        const curPrice = prices[h.ticker] || h.avgCost;
        const curVal   = h.qty * curPrice;
        const pnl      = curVal - invested;
        const pnlPct   = (pnl / invested) * 100;
        totalInvested += invested;
        currentValue  += curVal;
        return { ...h, curPrice, curVal, pnl, pnlPct, weight: 0 };
    });
    enriched.forEach(h => { h.weight = (h.curVal / currentValue) * 100; });

    const totalPnl    = currentValue - totalInvested;
    const totalPnlPct = (totalPnl / totalInvested) * 100;
    const pnlColor    = totalPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-alert)';
    const pnlSign     = totalPnl >= 0 ? '+' : '';

    const simData = AppState.lastSimulationResult;

    main.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1 class="page-title">${t('nav_dashboard')}</h1>
                <div class="page-subtitle">${t('dash_subtitle')}</div>
            </div>

            <!-- Stat Cards -->
            <div class="stats-grid">
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background: rgba(0,184,255,0.1); color:#00B8FF;">💰</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('dash_total_invested')}</div>
                        <div class="stat-value" style="color:#00B8FF;">${fmtVND(totalInvested)}</div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background: rgba(0,255,170,0.1); color:var(--neon-green);">📊</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('dash_current_value')}</div>
                        <div class="stat-value" style="color:var(--neon-green);">${fmtVND(currentValue)}</div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(${totalPnl>=0?'0,255,170':'255,85,85'},0.1); color:${pnlColor};">
                        ${totalPnl >= 0 ? '📈' : '📉'}
                    </div>
                    <div class="stat-body">
                        <div class="stat-label">${t('dash_pnl')}</div>
                        <div class="stat-value" style="color:${pnlColor};">${pnlSign}${fmtVND(totalPnl)}</div>
                    </div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon" style="background:rgba(${totalPnlPct>=0?'0,255,170':'255,85,85'},0.1); color:${pnlColor};">⚡</div>
                    <div class="stat-body">
                        <div class="stat-label">${t('dash_growth')}</div>
                        <div class="stat-value" style="color:${pnlColor};">${pnlSign}${totalPnlPct.toFixed(2)}%</div>
                    </div>
                </div>
            </div>

            <!-- Holdings Table + AI Summary -->
            <div class="dashboard-bottom-grid">
                <div class="glass-card table-card">
                    <div class="card-header">
                        <h3>${t('dash_holdings_title')}</h3>
                        <a href="#/portfolio" class="card-link">${t('dash_view_details')}</a>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>${t('dash_col_ticker')}</th>
                                    <th class="text-right">${t('dash_col_price')}</th>
                                    <th class="text-right">${t('dash_col_pnl')}</th>
                                    <th class="text-right">${t('dash_col_weight')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${enriched.map(h => `
                                    <tr>
                                        <td><span class="ticker-badge">${h.ticker}</span></td>
                                        <td class="text-right">${fmtVND(h.curPrice)}</td>
                                        <td class="text-right" style="color:${h.pnl>=0?'var(--neon-green)':'var(--neon-alert)'}">
                                            ${h.pnl>=0?'+':''}${h.pnlPct.toFixed(1)}%
                                        </td>
                                        <td class="text-right">
                                            <div class="weight-bar-wrap">
                                                <div class="weight-bar" style="width:${h.weight.toFixed(0)}%"></div>
                                                <span>${h.weight.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="glass-card ai-summary-card">
                    <div class="card-header">
                        <h3><span style="color:#a78bfa">✦</span> ${t('dash_ai_summary')}</h3>
                        <span class="ai-badge-sm">Gemini</span>
                    </div>
                    ${simData ? `
                        <div class="ai-summary-content">
                            <div class="ai-metric-row">
                                <span>Sharpe Ratio</span>
                                <strong style="color:var(--neon-green)">${simData.monte_carlo?.max_sharpe?.sharpe?.toFixed(2) ?? '--'}</strong>
                            </div>
                            <div class="ai-metric-row">
                                <span>Max Drawdown</span>
                                <strong style="color:var(--neon-alert)">${simData.advanced_metrics?.max_drawdown != null ? (simData.advanced_metrics.max_drawdown*100).toFixed(2)+'%' : '--'}</strong>
                            </div>
                            <div class="ai-metric-row">
                                <span>Beta vs VNINDEX</span>
                                <strong style="color:#00B8FF">${simData.advanced_metrics?.beta?.toFixed(2) ?? '--'}</strong>
                            </div>
                            <div class="ai-metric-row">
                                <span>Sortino Ratio</span>
                                <strong style="color:#F59E0B">${simData.advanced_metrics?.sortino?.toFixed(2) ?? '--'}</strong>
                            </div>
                            <div class="ai-insight">
                                ${generateQuickInsight(simData, totalPnlPct)}
                            </div>
                        </div>
                    ` : `
                        <div class="ai-empty-state">
                            <div class="ai-empty-icon">🔬</div>
                            <p>${t('dash_ai_empty')}</p>
                            <a href="#/risk-analysis" class="btn-primary btn-sm">${t('dash_ai_btn')}</a>
                        </div>
                    `}
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <h3 style="margin-bottom:1rem; color:var(--text-muted); font-size:0.9rem; text-transform:uppercase; letter-spacing:0.05em">${t('dash_quick_actions')}</h3>
                <div class="quick-action-grid">
                    <a href="#/risk-analysis" class="quick-action-card">
                        <span>🔬</span>
                        <strong>${t('nav_risk')}</strong>
                        <small>Monte Carlo & Stress Test</small>
                    </a>
                    <a href="#/portfolio" class="quick-action-card">
                        <span>💼</span>
                        <strong>${t('nav_portfolio')}</strong>
                        <small>Quản lý danh mục</small>
                    </a>
                    <a href="#/revenue" class="quick-action-card">
                        <span>📈</span>
                        <strong>${t('nav_revenue')}</strong>
                        <small>Hiệu suất hàng tháng</small>
                    </a>
                    <a href="#/ai-assistant" class="quick-action-card">
                        <span>🤖</span>
                        <strong>${t('nav_ai')}</strong>
                        <small>Hỏi chuyên gia AI</small>
                    </a>
                </div>
            </div>
        </div>
    `;

}

function generateQuickInsight(data, pnlPct) {
    const mdd  = data.advanced_metrics?.max_drawdown;
    const beta = data.advanced_metrics?.beta;
    const sharpe = data.monte_carlo?.max_sharpe?.sharpe;

    let insight = '';
    if (sharpe > 1.5) insight += `📊 Sharpe Ratio <strong>${sharpe.toFixed(2)}</strong> — hiệu suất rủi ro ở mức xuất sắc. `;
    else if (sharpe > 1) insight += `📊 Sharpe Ratio <strong>${sharpe.toFixed(2)}</strong> — danh mục có chất lượng tốt. `;
    else insight += `📊 Sharpe Ratio <strong>${sharpe?.toFixed(2) ?? '--'}</strong> — cân nhắc tái cơ cấu. `;

    if (mdd && Math.abs(mdd) > 0.2) insight += `⚠️ Max Drawdown <strong>${(mdd*100).toFixed(1)}%</strong> — rủi ro sụt giảm cần chú ý. `;

    if (beta && beta > 1.2) insight += `⚡ Beta <strong>${beta.toFixed(2)}</strong> — danh mục nhạy cảm với thị trường.`;
    else if (beta) insight += `🛡️ Beta <strong>${beta.toFixed(2)}</strong> — danh mục ổn định so với thị trường.`;

    return `<p style="font-size:0.9rem; line-height:1.7; color:#cbd5e1;">${insight}</p>`;
}

function fmtVND(v) {
    return Math.floor(v).toLocaleString('vi-VN') + '₫';
}
