import { getFinancials } from '../api.js';
import { t } from '../i18n.js';

let pollingInterval = null;

export function renderFinancials() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Get or initialize unique session ID for payments
    let currentSessionId = localStorage.getItem('nvt_session_id');
    if (!currentSessionId) {
        currentSessionId = 'S' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('nvt_session_id', currentSessionId);
    }

    main.innerHTML = `
    <div class="page-content" id="financials-page">
        <div class="page-header">
            <h1 class="page-title">📄 ${t('nav_financials')}</h1>
            <div class="page-subtitle">${t('fin_subtitle')} (TCBS Integration)</div>
        </div>

        <div class="glass-card" style="padding: 2rem; margin-bottom: 2rem; max-width: 600px;">
            <h3 style="margin-bottom: 1.5rem;">${t('fin_title')}</h3>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="fin-search-ticker" class="form-input" placeholder="VD: FPT, MWG, VCB..." style="flex: 1;">
                <button id="btn-fetch-financials" class="btn-primary">${t('fin_search_btn')}</button>
            </div>
            <p class="caption" style="margin-top: 1rem; color: var(--text-muted);">
                ${t('fin_search_hint')}
            </p>
        </div>

        <div id="fin-loading" style="display:none; margin: 2rem 0;">
            <div class="loading-spinner"></div>
            <p style="text-align:center; margin-top:10px; color:var(--neon-blue);">${t('fin_loading_tcbs')}</p>
        </div>

        <div id="fin-results" style="display:none;">
            <div class="glass-card results-card" style="padding: 2rem; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                    <div>
                        <h2 id="res-ticker" class="neon-blue" style="font-size: 2.5rem; margin: 0;">--</h2>
                        <div id="res-industry" class="caption" style="font-size: 1.1rem; color: var(--text-muted);">--</div>
                    </div>
                </div>

                <!-- Blurred overlay for locked content -->
                <div id="vip-lock-overlay" style="display: none; position: absolute; bottom: 0; left: 0; width: 100%; height: calc(100% - 100px); background: rgba(15,23,42,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); flex-direction: column; align-items: center; justify-content: center; border-radius: 0 0 12px 12px; border: 1px solid rgba(0,255,170,0.15); z-index: 10;">
                    <div style="text-align: center; padding: 2rem; color: white;">
                        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔒</span>
                        <h3 style="margin-bottom: 0.5rem; color: white;">Mở khóa Chỉ số nâng cao & Phân tích Độc quyền</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; max-width: 450px; line-height: 1.5;">
                            Ủng hộ tác giả 20.000₫ để kích hoạt toàn bộ dữ liệu tài chính doanh nghiệp liên thông hệ thống tối ưu danh mục đầu tư.
                        </p>
                        <button id="btn-unlock-vip" class="btn-primary" style="background: linear-gradient(135deg, #00ffaa, #00b8ff); border: none; font-weight: bold;">
                            🔑 Nhấn để Mở khóa bằng VietQR
                        </button>
                    </div>
                </div>

                <div class="metrics-grid-6" id="metrics-grid-container" style="transition: filter 0.3s ease;">
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_cap')}</span>
                        <strong id="res-marketcap" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_pepb')}</span>
                        <strong id="res-pepb" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_roe')}</span>
                        <strong id="res-roeroa" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_debt')}</span>
                        <strong id="res-debt" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_profit')}</span>
                        <strong id="res-profit" class="metric-val">--</strong>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">${t('fin_metric_rev')}</span>
                        <strong id="res-revenue" class="metric-val">--</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- VietQR Payment Modal Dialog -->
    <div id="payment-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.7); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:9999; justify-content:center; align-items:center;">
        <div class="glass-card" style="width:400px; padding:2rem; text-align:center; position:relative; border:1px solid rgba(0,255,170,0.3); background:#0f172a;">
            <button id="btn-close-modal" style="position:absolute; top:10px; right:15px; background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;">✕</button>
            <h3 style="margin-bottom:1rem; color:white;">Mở khóa Tính năng VIP</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.5rem; line-height: 1.4;">
                Quét mã QR bằng ứng dụng ngân hàng của bạn để tự động kích hoạt tính năng (Quyên góp ủng hộ tác giả).
            </p>
            
            <div id="qr-container" style="background:white; padding:10px; border-radius:8px; display:inline-block; margin-bottom:1.5rem; width:220px; height:220px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <img id="payment-qr-img" src="" alt="VietQR" style="width:200px; height:200px; display:block;">
            </div>

            <div style="font-size:1rem; font-weight:600; color:#00ffaa; margin-bottom:0.3rem;" id="payment-amount">Số tiền: --</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.5rem; font-family:monospace;" id="payment-content">Nội dung: --</div>
            
            <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:1.5rem;" id="polling-status">
                <div style="width:12px; height:12px; border:2px solid rgba(0,255,170,0.2); border-top-color:#00ffaa; border-radius:50%; animation:spin 1s linear infinite;"></div>
                <span style="font-size:0.85rem; color:#00ffaa;">Đang chờ thanh toán (Polling)...</span>
            </div>

            <button id="btn-mock-pay" class="btn-primary" style="width:100%; background:linear-gradient(135deg, #a78bfa, #8b5cf6); border-color:#8b5cf6;">
                Giả lập thanh toán thành công (Mock Pay)
            </button>
        </div>
    </div>
    `;

    bindFinancialsEvents(currentSessionId);
}

function bindFinancialsEvents(sessionId) {
    const btn = document.getElementById('btn-fetch-financials');
    const input = document.getElementById('fin-search-ticker');
    const unlockBtn = document.getElementById('btn-unlock-vip');
    const modal = document.getElementById('payment-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const mockPayBtn = document.getElementById('btn-mock-pay');

    // Polling and status unlock helper
    const checkVipStatus = async () => {
        try {
            const res = await fetch(`/api/payment-status?session_id=${sessionId}`);
            const data = await res.json();
            return data.paid;
        } catch {
            return false;
        }
    };

    const applyUnlockState = (unlocked) => {
        const overlay = document.getElementById('vip-lock-overlay');
        const container = document.getElementById('metrics-grid-container');
        if (!overlay || !container) return;

        if (unlocked) {
            overlay.style.display = 'none';
            container.style.filter = 'none';
        } else {
            overlay.style.display = 'flex';
            container.style.filter = 'blur(5px)';
        }
    };

    const fetchData = async () => {
        const ticker = input.value.trim().toUpperCase();
        if (!ticker) return;

        btn.disabled = true;
        btn.textContent = t('ai_analyzing');
        document.getElementById('fin-loading').style.display = 'block';
        document.getElementById('fin-results').style.display = 'none';

        try {
            const data = await getFinancials(ticker);
            if (data.error) throw new Error(data.error);

            document.getElementById('res-ticker').textContent = data.ticker;
            document.getElementById('res-industry').textContent = data.industry || '--';
            document.getElementById('res-marketcap').textContent = data.marketCap ? (data.marketCap).toLocaleString() : '--';
            document.getElementById('res-pepb').textContent = `${(data.pe || 0).toFixed(2)} | ${(data.pb || 0).toFixed(2)}`;
            document.getElementById('res-roeroa').textContent = `${(data.roe || 0).toFixed(2)}% | ${(data.roa || 0).toFixed(2)}%`;
            document.getElementById('res-debt').textContent = `${(data.debt_on_equity || 0).toFixed(2)} Lần`;
            document.getElementById('res-profit').textContent = `${(data.profit_growth || 0).toFixed(2)}%`;
            document.getElementById('res-revenue').textContent = `${(data.revenue_growth || 0).toFixed(2)}%`;

            // Display results container
            document.getElementById('fin-results').style.display = 'block';

            // Check if user has already unlocked VIP
            const isPaid = localStorage.getItem('nvt_vip_unlocked') === 'true' || await checkVipStatus();
            if (isPaid) {
                localStorage.setItem('nvt_vip_unlocked', 'true');
                applyUnlockState(true);
            } else {
                applyUnlockState(false);
            }

        } catch (err) {
            alert(t('fin_error_fetch') + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = t('fin_search_btn');
            document.getElementById('fin-loading').style.display = 'none';
        }
    };

    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    };

    const startPollingStatus = () => {
        stopPolling();
        pollingInterval = setInterval(async () => {
            const isPaid = await checkVipStatus();
            if (isPaid) {
                stopPolling();
                localStorage.setItem('nvt_vip_unlocked', 'true');
                applyUnlockState(true);
                modal.style.display = 'none';
            }
        }, 2000);
    };

    // Events
    btn.addEventListener('click', fetchData);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchData();
    });

    unlockBtn.addEventListener('click', async () => {
        modal.style.display = 'flex';
        try {
            const res = await fetch(`/api/payment/payment-qr?session_id=${sessionId}&amount=20000`);
            const payInfo = await res.json();

            document.getElementById('payment-qr-img').src = payInfo.qr_url;
            document.getElementById('payment-amount').textContent = `Số tiền: ${payInfo.amount.toLocaleString('vi-VN')}₫`;
            document.getElementById('payment-content').textContent = `Nội dung: ${payInfo.content}`;

            startPollingStatus();
        } catch (err) {
            console.error("Lỗi lấy thông tin QR:", err);
            alert("Lỗi tải thông tin thanh toán VietQR.");
        }
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        stopPolling();
    });

    mockPayBtn.addEventListener('click', async () => {
        try {
            mockPayBtn.disabled = true;
            mockPayBtn.textContent = "Đang xử lý...";
            const res = await fetch('/api/payment/payment-mock-trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            });
            const result = await res.json();
            if (result.success) {
                // Instantly update UI and store status
                localStorage.setItem('nvt_vip_unlocked', 'true');
                applyUnlockState(true);
                stopPolling();
                setTimeout(() => {
                    modal.style.display = 'none';
                    mockPayBtn.disabled = false;
                    mockPayBtn.textContent = "Giả lập thanh toán thành công (Mock Pay)";
                }, 500);
            }
        } catch (err) {
            alert("Lỗi giả lập thanh toán: " + err.message);
            mockPayBtn.disabled = false;
            mockPayBtn.textContent = "Giả lập thanh toán thành công (Mock Pay)";
        }
    });
}


