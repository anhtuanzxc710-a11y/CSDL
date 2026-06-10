import { PerformanceService } from '../services/performanceService.js';
import { AppState } from '../state.js';
import { t } from '../i18n.js';

function fmtVND(v) { return Math.floor(v ?? 0).toLocaleString('vi-VN') + '₫'; }

export async function renderRevenue() {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!AppState.selectedPortfolioId) {
        main.innerHTML = `
            <div class="page-content">
                <div class="page-header">
                    <h1 class="page-title">${t('rev_title')}</h1>
                </div>
                <div class="glass-card" style="padding:2rem; text-align:center;">
                    <p>${t('rev_empty_hint')}</p>
                </div>
            </div>
        `;
        return;
    }

    try {
        const data = await PerformanceService.getPerformance(AppState.selectedPortfolioId);

        if (!data || !data.values || data.values.length === 0) {
            throw new Error("No data returned");
        }

        const pnlColor = data.totalProfit >= 0 ? 'var(--neon-green)' : 'var(--neon-alert)';

        main.innerHTML = `
            <div class="page-content">
                <div class="page-header">
                    <h1 class="page-title">${t('rev_title')}</h1>
                    <div class="page-subtitle">${t('rev_subtitle')}</div>
                </div>

                <!-- KPI Cards -->
                <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom:1.5rem;">
                    <div class="glass-card" style="padding:1.5rem;">
                        <div class="text-sm" style="color:var(--text-muted)">${t('dash_total_invested')}</div>
                        <div class="text-xl" style="color:#00B8FF; font-weight:700; margin-top:0.5rem;">
                            ${fmtVND(data.totalInvested)}
                        </div>
                    </div>
                    <div class="glass-card" style="padding:1.5rem;">
                        <div class="text-sm" style="color:var(--text-muted)">${t('dash_current_value')}</div>
                        <div class="text-xl" style="color:var(--neon-green); font-weight:700; margin-top:0.5rem;">
                            ${fmtVND(data.portfolioValue)}
                        </div>
                    </div>
                    <div class="glass-card" style="padding:1.5rem;">
                        <div class="text-sm" style="color:var(--text-muted)">${t('dash_pnl')}</div>
                        <div class="text-xl" style="color:${pnlColor}; font-weight:700; margin-top:0.5rem;">
                            ${data.totalProfit >= 0 ? '+' : ''}${fmtVND(data.totalProfit)}
                        </div>
                    </div>
                    <div class="glass-card" style="padding:1.5rem;">
                        <div class="text-sm" style="color:var(--text-muted)">${t('rev_metric_top')}</div>
                        <div class="text-xl" style="color:#F59E0B; font-weight:700; margin-top:0.5rem;">
                            ${data.topTicker || '--'}
                        </div>
                    </div>
                </div>

                <!-- Main Chart -->
                <div class="glass-card" style="padding:1.5rem; margin-bottom:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0;">${t('rev_chart_title')}</h3>
                    </div>
                    <div id="chart-revenue" style="width:100%; height:400px;"></div>
                </div>
            </div>
        `;

        renderChart(data);
    } catch (e) {
        console.error("Lỗi lấy dữ liệu Revenue:", e);
        main.innerHTML = `
            <div class="page-content">
                <div class="page-header"><h1 class="page-title">${t('rev_title')}</h1></div>
                <div class="glass-card auth-error" style="padding:2rem;">${t('rev_error_load')}</div>
            </div>
        `;
    }
}

function renderChart(data) {
    if (!window.Plotly) return;

    const trace = {
        x: data.months,
        y: data.values,
        type: 'scatter',
        mode: 'lines+markers',
        name: t('rev_chart_trace'),
        line: { color: '#00FFAA', width: 3 },
        marker: { size: 8, color: '#00B8FF' },
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 255, 170, 0.1)'
    };

    const layout = {
        template: 'plotly_dark',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 60, r: 20, t: 30, b: 40 },
        font: { color: '#94A3B8' },
        xaxis: {
            title: t('rev_chart_xaxis'),
            showgrid: false,
            zeroline: false
        },
        yaxis: {
            title: t('rev_chart_yaxis'),
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.05)',
            zeroline: false
        }
    };

    Plotly.newPlot('chart-revenue', [trace], layout, { responsive: true, displayModeBar: false });
}

