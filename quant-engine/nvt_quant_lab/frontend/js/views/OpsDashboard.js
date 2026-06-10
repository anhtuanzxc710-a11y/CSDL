import { getHealthDependencies, getAuditLogs } from '../api.js';
import { AppState } from '../state.js';
import { t } from '../i18n.js';

export async function renderOpsDashboard() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h1 class="page-title">⚙️ System Operations Dashboard</h1>
                <div class="page-subtitle">Platform health, dependency status, database backups, and security audit logs.</div>
            </div>

            <!-- Health Status Indicators -->
            <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 1.5rem;">
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Overall System Status</div>
                    <div id="ops-overall-status" style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem;">Connecting...</div>
                    <span id="ops-overall-dot" class="status-dot" style="margin-top: 0.5rem; display: inline-block;"></span>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Database Latency</div>
                    <div id="ops-db-latency" style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem; color: var(--neon-green);">--</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">SQL query roundtrip</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Market Data Connection</div>
                    <div id="ops-md-status" style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem;">--</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Entrade API connectivity</div>
                </div>
                <div class="glass-card" style="padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Cache & Disk Storage</div>
                    <div id="ops-storage-status" style="font-size: 1.8rem; font-weight: bold; margin-top: 0.5rem;">--</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Logs & exports path</div>
                </div>
            </div>

            <!-- Detailed Dependency Health Checks -->
            <div class="metrics-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="glass-card" style="padding: 1.5rem;">
                    <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">🔍 Dependency Status</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Database Check:</span>
                            <strong id="chk-db">--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>AI Copilot Engine (Gemini):</span>
                            <strong id="chk-ai">--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>System Cache Hits:</span>
                            <strong id="chk-cache-hits">--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Log Folder Writability:</span>
                            <strong id="chk-logs-write">--</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Report Export Writability:</span>
                            <strong id="chk-data-write">--</strong>
                        </div>
                    </div>
                </div>
                
                <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">💾 Database Backups & Operations</h3>
                        <p style="font-size: 0.9rem; line-height: 1.4; color: var(--text-muted);">
                            The SQLite database is backed up automatically using <code>scripts/backup_database.py</code>.
                        </p>
                        <p style="font-size: 0.9rem; line-height: 1.4; color: var(--text-muted);">
                            <strong>Retention Policy:</strong> 7 days (older backups are pruned automatically to save disk space).<br>
                            <strong>Location:</strong> <code>backend/backups/YYYY-MM-DD/app_TIMESTAMP.db</code>
                        </p>
                    </div>
                    <div style="padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.85rem; color: var(--text-muted);">Configured log paths:</span>
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace; margin-top: 0.25rem;">
                            - backend/logs/app.log (System logs)<br>
                            - backend/logs/error.log (Error traces)<br>
                            - backend/logs/audit.log (Security audits)
                        </div>
                    </div>
                </div>
            </div>

            <!-- Security Audit Logs Table -->
            <div class="glass-card" style="padding: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">🛡️ Security Audit Logs</h3>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Entity Type</th>
                                <th>Entity ID</th>
                                <th>User ID</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody id="ops-audit-tbody">
                            <tr><td colspan="5" style="text-align: center;">Loading audit logs...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Load dynamic data
    await loadOpsData();
}

async function loadOpsData() {
    const elStatus = document.getElementById('ops-overall-status');
    const elDot = document.getElementById('ops-overall-dot');
    const elDbLat = document.getElementById('ops-db-latency');
    const elMd = document.getElementById('ops-md-status');
    const elStorage = document.getElementById('ops-storage-status');

    const chkDb = document.getElementById('chk-db');
    const chkAi = document.getElementById('chk-ai');
    const chkCache = document.getElementById('chk-cache-hits');
    const chkLogs = document.getElementById('chk-logs-write');
    const chkData = document.getElementById('chk-data-write');

    const auditTbody = document.getElementById('ops-audit-tbody');

    // Fetch Health check API
    try {
        const h = await getHealthDependencies();
        
        // Update Overall status UI
        if (h.status === 'ok') {
            elStatus.textContent = 'HEALTHY';
            elStatus.style.color = 'var(--neon-green)';
            elDot.className = 'status-dot online';
        } else if (h.status === 'degraded') {
            elStatus.textContent = 'DEGRADED';
            elStatus.style.color = '#F59E0B';
            elDot.className = 'status-dot';
            elDot.style.background = '#F59E0B';
        } else {
            elStatus.textContent = 'ERROR';
            elStatus.style.color = '#FF5555';
            elDot.className = 'status-dot offline';
        }

        // Update database info
        if (h.checks.database && h.checks.database.status === 'ok') {
            elDbLat.textContent = h.checks.database.latency_ms + 'ms';
            chkDb.innerHTML = `<span style="color:var(--neon-green)">Online (${h.checks.database.latency_ms}ms)</span>`;
        } else {
            elDbLat.textContent = 'DOWN';
            elDbLat.style.color = '#FF5555';
            chkDb.innerHTML = '<span style="color:#FF5555">Disconnected</span>';
        }

        // Update market data info
        if (h.checks.market_data && h.checks.market_data.status === 'ok') {
            elMd.textContent = 'ONLINE';
            elMd.style.color = 'var(--neon-green)';
        } else {
            elMd.textContent = 'DEGRADED';
            elMd.style.color = '#F59E0B';
        }

        // Update AI provider info
        if (h.checks.ai_provider && h.checks.ai_provider.status === 'ok') {
            chkAi.innerHTML = '<span style="color:var(--neon-green)">Gemini Online</span>';
        } else {
            chkAi.innerHTML = `<span style="color:#F59E0B">Degraded (${h.checks.ai_provider.message || 'Config missing'})</span>`;
        }

        // Update cache info
        if (h.checks.cache) {
            const cache = h.checks.cache;
            chkCache.innerHTML = `<span style="color:var(--neon-green)">${cache.hits} Hits / ${cache.misses} Misses (Hit rate: ${(cache.hit_rate * 100).toFixed(1)}%)</span>`;
        }

        // Update storage info
        if (h.checks.storage) {
            const stor = h.checks.storage;
            const statusOk = stor.status === 'ok';
            elStorage.textContent = statusOk ? 'WRITABLE' : 'ERROR';
            elStorage.style.color = statusOk ? 'var(--neon-green)' : '#FF5555';
            
            chkLogs.innerHTML = stor.logs_path.writable 
                ? '<span style="color:var(--neon-green)">Writable ✓</span>' 
                : '<span style="color:#FF5555">ReadOnly ✕</span>';
            
            chkData.innerHTML = stor.export_path.writable 
                ? '<span style="color:var(--neon-green)">Writable ✓</span>' 
                : '<span style="color:#FF5555">ReadOnly ✕</span>';
        }

    } catch (err) {
        elStatus.textContent = 'API ERROR';
        elStatus.style.color = '#FF5555';
        elDot.className = 'status-dot offline';
        elDbLat.textContent = 'OFFLINE';
        elDbLat.style.color = '#FF5555';
        elMd.textContent = 'OFFLINE';
        elMd.style.color = '#FF5555';
        elStorage.textContent = 'OFFLINE';
        elStorage.style.color = '#FF5555';
    }

    // Fetch Audit logs
    try {
        const logs = await getAuditLogs();
        if (logs.length === 0) {
            auditTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No audit logs recorded yet.</td></tr>';
            return;
        }

        auditTbody.innerHTML = logs.map(l => {
            let details = '';
            try {
                if (l.detail_json) {
                    const parsed = JSON.parse(l.detail_json);
                    details = Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join(', ');
                }
            } catch {
                details = l.detail_json || '';
            }

            const formattedTime = new Date(l.created_at).toLocaleString(AppState.currentLang === 'vi' ? 'vi-VN' : 'en-US');
            return `
                <tr>
                    <td><strong>${l.action}</strong><br><small style="color:var(--text-muted); font-size:0.75rem;">${details}</small></td>
                    <td><span class="ticker-badge">${l.entity_type}</span></td>
                    <td>${l.entity_id || '--'}</td>
                    <td>${l.user_id || '--'}</td>
                    <td>${formattedTime}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        auditTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #FF5555; padding: 2rem;">Error fetching audit logs. Check auth permissions.</td></tr>';
    }
}
