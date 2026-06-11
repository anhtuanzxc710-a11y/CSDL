import { SystemService } from '../services/systemService.js';
import { API_BASE } from '../api.js';
import { t } from '../i18n.js';
import { AppState } from '../state.js';

export async function renderReports() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1 class="page-title">${t('rep_title')}</h1>
                <div class="page-subtitle">${t('rep_subtitle')}</div>
            </div>
            
            <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom:1.5rem;">
               <div class="glass-card" style="padding:1.5rem; display:flex; flex-direction:column;">
                   <h3>${t('rep_pdf_title')}</h3>
                   <p style="color:var(--text-muted); flex:1;">${t('rep_pdf_desc')}</p>
                   <button class="btn-primary btn-generate" data-fmt="pdf" style="margin-top:1rem; width:100%;">${t('rep_pdf_btn')}</button>
               </div>
               
               <div class="glass-card" style="padding:1.5rem; display:flex; flex-direction:column;">
                   <h3>${t('rep_data_title')}</h3>
                   <p style="color:var(--text-muted); flex:1;">${t('rep_data_desc')}</p>
                   <button class="btn-primary btn-generate" data-fmt="xlsx" style="margin-top:1rem; width:100%; background:var(--neon-green); color:#000;">${t('rep_data_btn')}</button>
               </div>
            </div>

            <!-- Download History -->
            <div class="glass-card" style="padding:1.5rem;">
                <h3 style="margin-top:0; margin-bottom:1rem;">${t('rep_hist_title')}</h3>
                <div id="reports-msg" style="display:none; color:var(--neon-green); margin-bottom:1rem; padding:0.5rem; border:1px solid var(--neon-green); border-radius:4px; text-align:center;"></div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>${t('rep_col_name')}</th>
                                <th>${t('rep_col_fmt')}</th>
                                <th>${t('rep_col_time')}</th>
                                <th class="text-right">${t('rep_col_action')}</th>
                            </tr>
                        </thead>
                        <tbody id="reports-tbody">
                            <tr><td colspan="4" style="text-align:center;">${t('ai_loading_thread')}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.btn-generate').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fmt = e.target.getAttribute('data-fmt');
            const originalText = e.target.textContent;
            e.target.textContent = t('rep_loading');
            e.target.disabled = true;

            try {
                await SystemService.generateReport(fmt);
                const msg = document.getElementById('reports-msg');
                msg.textContent = t('rep_done_msg');
                msg.style.display = 'block';
                setTimeout(() => msg.style.display = 'none', 4000);
                setTimeout(loadReports, 2500); // refresh list
            } catch (err) {
                alert(t('rep_err_gen'));
            } finally {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }
        });
    });

    loadReports();
}

async function loadReports() {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;
    try {
        const reports = await SystemService.getReports();
        if (reports.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">${t('rep_empty')}</td></tr>`;
            return;
        }

        tbody.innerHTML = reports.map(r => `
            <tr>
                <td><strong>${r.storage_path || 'Báo cáo'}</strong></td>
                <td><span class="ticker-badge">${r.report_type}</span></td>
                <td>${new Date(r.created_at).toLocaleString(AppState.currentLang === 'vi' ? 'vi-VN' : 'en-US')}</td>
                <td class="text-right">
                    <button class="btn-primary btn-sm" onclick="window.open('${API_BASE}/api/system/reports/'+${r.id}+'/download', '_blank')">${t('rep_btn_dl')}</button>
                </td>
            </tr>
        `).join('');
    } catch {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">${t('rep_err_load')}</td></tr>`;
    }
}

