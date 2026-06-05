const I18N = {
    'en': {
        'subtitle': 'AI Investment Advisor',
        'nav_opt': 'Portfolio Optimizer',
        'nav_eval': 'Portfolio Evaluator',
        'params_title': 'Investment Parameters',
        'eval_title': 'My Custom Portfolio',
        'label_tickers': 'Stock Tickers (comma separated)',
        'ph_tickers': 'e.g. FPT, VCB',
        'label_capital': 'Initial Capital (VND)',
        'ph_capital': 'e.g. 1,000,000,000',
        'label_return': 'Target Return (%)',
        'btn_run': 'Run Simulation',
        'btn_eval': 'Evaluate Portfolio 🔍',
        'btn_stress': '🔥 Stress Test',
        'btn_add_stock': '+ Add Stock',
        'label_timeframe': 'Timeframe',
        'tf_1m': '1 Month (21 Days)',
        'tf_3m': '3 Months (63 Days)',
        'tf_6m': '6 Months (126 Days)',
        'tf_1y': '1 Year (252 Days)',
        'main_title': 'Portfolio Status',
        'status_connected': 'Server Connected',
        'chart_title': 'Analysis & Projections',
        'chart_desc': 'High-performance API: Calculated natively via Python arrays.',
        'metric_proj': 'Projected Expected Value',
        'metric_risk': 'Max Risk (VaR 95%)',
        'var_profitable_label': 'Still Profitable',
        'var_positive_tooltip': 'Even in the worst 5% scenario, portfolio is estimated to remain profitable – excellent portfolio quality!',
        'var_negative_tooltip': 'Maximum estimated loss at 95% confidence level.',
        'err_conn': 'Server Connection Failed',
        'err_wait': 'Waiting for Python Backend (FastAPI).<br>Run: uvicorn main:app --reload',
        'err_input': 'Alert: Please double check your numerical inputs!',
        'disclaimer_title': '⚠️ Disclaimer:',
        'ai_disclaimer': 'AI analysis is strictly based on historical data and the latest financial reports. It cannot forecast sudden or unprecedented future events. Past performance is no guarantee of future results.',
        'ci_text': '95% Prob. Range:',
        'stress_drop': 'Crash -5% VN-Index: ',
        'loading_api': 'Computing...',
        'ai_title': 'Gemini AI — Investment Insights',
        'ai_subtitle': 'Deep analysis based on 10,000 Monte Carlo scenarios',
        'ai_analyzing': 'Analyzing...',
        'ai_thinking': 'Gemini is processing data...',
        'ai_done': 'Analysis Complete',
        'backtest_title': 'Historical Performance (Backtest)',
        'backtest_desc': 'Portfolio historical cumulative returns compared to VNINDEX.',
        'allocation_title': 'Optimal Asset Allocation',
        'allocation_desc': 'Optimized capital distribution across selected stocks.',
        'raw_price_title': 'Closing Prices Table',
        'adv_metrics_title': 'Advanced Quant Metrics',
        'live_capital_label': 'Estimated Total Capital',
        'last_updated': 'Last updated: ',
        'welcome_title': 'Welcome to DNT Quant Lab',
        'welcome_desc': 'Enter your investment parameters and run the simulation to generate an AI-optimized portfolio.',
        'nav_fin': 'Financial Reports 📄',
        'fin_title': 'Search Financials',
        'fin_ticker_label': 'Ticker Symbol',
        'fin_ticker_ph': 'e.g. FPT',
        'btn_fetch_fin': 'Fetch Data',
        'fin_card_title': 'Financial Report: ',
        'fin_desc': 'Fundamental data from TCBS. Unlock for valuation & performance metrics.',
        'fin_ind': 'Industry',
        'fin_mc': 'Market Cap (Billion VND)',
        'fin_pepb': 'P/E | P/B',
        'fin_roeroa': 'ROE | ROA Margin',
        'fin_debt': 'Debt / Equity',
        'fin_profit': 'Profit Growth',
        'btn_unlock': 'Unlock',
        'polling_text': 'Waiting for payment (Polling)...',
        'btn_export_pdf': '⬇️ Download PDF',
        'pdf_title': 'VIP INVESTMENT ADVISORY REPORT',
        'use_bctc_cb': 'Include RAG Document in Prompt (Costs AI ~15s)',
        'sig_col_ticker': 'Ticker',
        'sig_col_signal': 'Signal',
        'sig_col_vol': 'Suggested Volume',
        'sig_col_action': 'Execution',
        'btn_vps_cta': 'Open VPS Trading ↗',
        'signals_title': 'Real-Time Trading Signals',
        'signals_desc': 'Technical Analysis (SMA Crossover) & Direct Broker Integration.'
    },
    'vi': {
        'subtitle': 'Trợ lý Đầu tư AI',
        'nav_opt': 'Tối ưu hóa Danh mục',
        'nav_eval': 'Đánh giá Danh mục',
        'params_title': 'Thông số đầu vào',
        'eval_title': 'Danh mục hiện tại',
        'label_tickers': 'Mã cổ phiếu (ngăn cách bằng dấu phẩy)',
        'ph_tickers': 'Ví dụ: FPT, MWG, VCB',
        'label_capital': 'Vốn ban đầu (VNĐ)',
        'ph_capital': 'Ví dụ: 1.000.000.000',
        'label_return': 'Lợi nhuận kỳ vọng (%)',
        'btn_run': '🚀 Chạy mô phỏng',
        'btn_eval': '🔍 Đánh giá Danh mục',
        'btn_stress': '🔥 Stress Test',
        'btn_add_stock': '+ Thêm mã',
        'label_timeframe': 'Kỳ hạn',
        'tf_1m': '1 tháng (21 ngày giao dịch)',
        'tf_3m': '3 tháng (63 ngày giao dịch)',
        'tf_6m': '6 tháng (126 ngày giao dịch)',
        'tf_1y': '1 năm (252 ngày giao dịch)',
        'main_title': 'Tổng quan Danh mục',
        'status_connected': 'Đã kết nối máy chủ',
        'chart_title': 'Phân tích & Dự phóng',
        'chart_desc': 'Tính toán Monte Carlo qua Python API — 10.000 kịch bản ngẫu nhiên.',
        'metric_proj': 'Giá trị kỳ vọng',
        'metric_risk': 'Rủi ro tối đa (VaR 95%)',
        'var_profitable_label': 'Vẫn sinh lời',
        'var_positive_tooltip': 'Ở kịch bản xấu nhất 5% xác suất, danh mục ước tính vẫn có lãi – chất lượng danh mục tốt!',
        'var_negative_tooltip': 'Mức lỗ tối đa ước tính ở ngưỡng tin cậy 95%.',
        'err_conn': 'Mất kết nối với máy chủ',
        'err_wait': 'Không thể kết nối Backend Python (FastAPI).<br>Chạy lệnh: uvicorn main:app --reload',
        'err_input': 'Vui lòng kiểm tra lại dữ liệu nhập — cần ít nhất 2 mã cổ phiếu hợp lệ!',
        'disclaimer_title': '⚠️ Lưu ý quan trọng:',
        'ai_disclaimer': 'Kết quả phân tích chỉ dựa trên dữ liệu lịch sử và không phải là lời khuyên đầu tư. Hiệu suất trong quá khứ không đảm bảo cho kết quả tương lai. Nhà đầu tư tự chịu trách nhiệm về quyết định của mình.',
        'ci_text': 'Khoảng tin cậy 95%:',
        'stress_drop': 'VN-Index -5%: tổn thất ước tính ',
        'loading_api': 'Đang tính toán...',
        'ai_title': 'Gemini AI — Lời khuyên Đầu tư',
        'ai_subtitle': 'Phân tích chuyên sâu dựa trên 10.000 kịch bản Monte Carlo',
        'ai_analyzing': 'Đang phân tích...',
        'ai_thinking': 'Gemini đang xử lý dữ liệu...',
        'ai_done': 'Hoàn tất phân tích',
        'backtest_title': 'Hiệu suất Lịch sử (Backtest)',
        'backtest_desc': 'So sánh lợi nhuận tích lũy của danh mục với VN-Index.',
        'allocation_title': 'Phân bổ Tài sản Tối ưu',
        'allocation_desc': 'Tỉ trọng phân bổ vốn chi tiết cho từng mã cổ phiếu.',
        'raw_price_title': 'Bảng Giá Đóng cửa',
        'adv_metrics_title': 'Chỉ số Quant Nâng cao',
        'live_capital_label': 'Tổng Vốn Ước Tính',
        'last_updated': 'Cập nhật lần cuối: ',
        'welcome_title': 'Chào mừng đến với DNT Quant Lab',
        'welcome_desc': 'Nhập các thông số đầu tư và chạy mô phỏng để tạo danh mục được tối ưu hóa bởi AI.',
        'nav_fin': 'Báo cáo Tài chính 📄',
        'fin_title': 'Tra Cứu BCTC',
        'fin_ticker_label': 'Mã Cổ phiếu',
        'fin_ticker_ph': 'VD: FPT',
        'btn_fetch_fin': 'Lấy Dữ Liệu',
        'fin_card_title': 'Báo Cáo Tài Chính: ',
        'fin_desc': 'Dữ liệu cơ bản từ TCBS. Mở khóa để xem các chỉ số định giá & hiệu quả HĐKD.',
        'fin_ind': 'Ngành nghề',
        'fin_mc': 'Vốn hóa (Tỷ VND)',
        'fin_pepb': 'P/E | P/B',
        'fin_roeroa': 'Biên ROE | ROA',
        'fin_debt': 'Nợ / Vốn CSH',
        'fin_profit': 'Tăng trưởng LN',
        'btn_unlock': 'Mở khóa',
        'polling_text': 'Đang chờ nhận thanh toán (Polling)...',
        'btn_export_pdf': '⬇️ Tải PDF',
        'pdf_title': 'BÁO CÁO TƯ VẤN ĐẦU TƯ VIP',
        'use_bctc_cb': 'Đính kèm vào Prompt (AI tốn thêm ~15s)',
        'sig_col_ticker': 'Mã CP',
        'sig_col_signal': 'Tín Hiệu',
        'sig_col_vol': 'Khối Lượng Đề Xuất',
        'sig_col_action': 'Khớp Lệnh',
        'btn_vps_cta': 'Mở VPS Đặt Lệnh ↗',
        'signals_title': 'Tín Hiệu Giao Dịch Thời Gian Thực',
        'signals_desc': 'Tín hiệu Phân tích Kỹ thuật (SMA Crossover) & Đặt lệnh mua bán liên thông VPS.'
    }
};

document.addEventListener("DOMContentLoaded", () => {
    
    // --- Ngôn ngữ (i18n) ---
    const langSelector = document.getElementById("lang-selector");
    let currentLang = 'en';

    function updateLanguage() {
        currentLang = langSelector.value;
        const dict = I18N[currentLang];
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (dict[key]) el.textContent = dict[key];
        });
        document.querySelectorAll("[data-i18n-ph]").forEach(el => {
            const key = el.getAttribute("data-i18n-ph");
            if (dict[key]) el.setAttribute("placeholder", dict[key]);
        });
    }
    
    langSelector.addEventListener("change", updateLanguage);
    updateLanguage(); 

    // --- Tab Switch Logic ---
    let currentMode = 'optimizer';
    const navItems = document.querySelectorAll(".nav-menu .nav-item");
    const modeOpts = document.getElementById("mode-optimizer");
    const modeEval = document.getElementById("mode-evaluator");
    const modeFin = document.getElementById("mode-financial");
    
    function hideAllModes() {
        modeOpts.style.display = 'none';
        modeEval.style.display = 'none';
        if(modeFin) modeFin.style.display = 'none';
        navItems.forEach(el => el.classList.remove('active'));
        document.getElementById("view-quant").style.display = 'none';
        document.getElementById("view-financial").style.display = 'none';
    }

    navItems[0].addEventListener("click", () => {
        hideAllModes(); navItems[0].classList.add('active');
        modeOpts.style.display = 'block'; currentMode = 'optimizer';
        document.getElementById("view-quant").style.display = 'block';
    });
    navItems[1].addEventListener("click", () => {
        hideAllModes(); navItems[1].classList.add('active');
        modeEval.style.display = 'block'; currentMode = 'evaluator';
        document.getElementById("view-quant").style.display = 'block';
    });
    if(navItems[2]) {
        navItems[2].addEventListener("click", () => {
            hideAllModes(); navItems[2].classList.add('active');
            modeFin.style.display = 'block'; currentMode = 'financial';
            document.getElementById("view-financial").style.display = 'block';
        });
    }

    // --- Evaluator Dynamic Rows ---
    const addRowBtn = document.getElementById("add-holding-btn");
    const holdingsList = document.getElementById("holdings-list");
    addRowBtn.addEventListener("click", () => {
        const div = document.createElement("div");
        div.className = "holding-row";
        div.style.cssText = "display: flex; gap: 5px; margin-bottom: 5px;";
        div.innerHTML = `
            <input type="text" class="glass-input t-input" placeholder="Ticker" style="width: 50%;">
            <input type="number" class="glass-input v-input" placeholder="Qty" style="width: 40%;">
            <button class="remove-btn" style="background:var(--neon-alert); color:white; border:none; border-radius:4px; width: 10%; font-weight:bold; cursor:pointer;">X</button>
        `;
        div.querySelector('.remove-btn').onclick = () => { div.remove(); onInputChanged(); };
        holdingsList.appendChild(div);
        attachInputListeners();
    });

    // --- Live Capital (Debounce Live Pricing) ---
    let typingTimer;
    let cachedPrices = {};
    
    function attachInputListeners() {
        const inputs = document.querySelectorAll(".holding-row input");
        inputs.forEach(input => {
            input.removeEventListener('input', onInputChanged); // prevent duplicate bindings
            input.addEventListener('input', onInputChanged);
        });
    }

    function onInputChanged() {
        clearTimeout(typingTimer);
        document.getElementById("live-capital-display").textContent = "...";
        typingTimer = setTimeout(calculateLiveCapital, 600);
    }

    async function calculateLiveCapital() {
        const rows = document.querySelectorAll(".holding-row");
        let queryTickers = [];
        let holdings = [];
        
        for(let row of rows) {
            let t = row.querySelector('.t-input').value.trim().toUpperCase();
            let v = parseFloat(row.querySelector('.v-input').value);
            if (t) {
                queryTickers.push(t);
                if (!isNaN(v)) holdings.push({t, v});
            }
        }
        
        if (queryTickers.length === 0) {
            document.getElementById("live-capital-display").textContent = "0₫";
            return;
        }
        
        let tickersQueryStr = queryTickers.join(",");
        try {
            let res = await fetch('/api/current-prices?tickers=' + tickersQueryStr);
            let prices = await res.json();
            
            Object.assign(cachedPrices, prices);
            
            let total = 0;
            for (let h of holdings) {
                if (cachedPrices[h.t]) {
                    total += cachedPrices[h.t] * h.v;
                }
            }
            document.getElementById("live-capital-display").textContent = formatVND(total);
        } catch (e) {
            console.error("Lỗi cập nhật giá realtime:", e);
        }
    }

    // --- Currency Formatting for Capital Input ---
    const capitalInput = document.getElementById("capital-input");
    if (capitalInput) {
        capitalInput.addEventListener("input", (e) => {
            let value = e.target.value.replace(/[^0-9]/g, "");
            if (value) {
                e.target.value = parseInt(value).toLocaleString("vi-VN");
            } else {
                e.target.value = "";
            }
        });
    }
    
    // Call initial listener
    attachInputListeners();

    // --- Common API Handlers ---
    const apiStatus = document.getElementById("api-status");
    const statusDot = document.querySelector(".status-dot");
    const runBtn = document.getElementById("run-btn");
    const evalBtn = document.getElementById("eval-btn");
    const stressBtn = document.getElementById("stress-btn");

    let latestSimulationData = null;

    function formatVND(value) {
        return Math.floor(value).toLocaleString('vi-VN') + '₫';
    }

    function handleApiResponse(data) {
        if (data.error) {
            alert(data.error);
            return;
        }
        
        latestSimulationData = data;
        
        // Hide welcome message on first result
        const welcome = document.getElementById("welcome-message");
        if (welcome) welcome.style.display = "none";

        if (data.chart) {
            Plotly.react('chart-container', data.chart.data, data.chart.layout, { responsive: true, displayModeBar: false });
            document.getElementById('main-chart-card').style.display = 'block';
        } else {
            // Hide main chart on Evaluator Mode
            const mainCard = document.getElementById('main-chart-card');
            if(mainCard) mainCard.style.display = 'none';
        }
        
        if (data.backtest_chart) {
            document.getElementById('backtest-card').style.display = 'block';
            Plotly.react('backtest-chart-container', data.backtest_chart.data, data.backtest_chart.layout, { responsive: true, displayModeBar: false });
        }
        
        if (data.pie_chart) {
            document.getElementById('pie-card').style.display = 'block';
            Plotly.react('pie-chart-container', data.pie_chart.data, data.pie_chart.layout, { responsive: true, displayModeBar: false });
        }
        
        if (data.raw_prices) {
            document.getElementById('raw-prices-card').style.display = 'block';
            if (data.last_updated_date) {
                document.getElementById('timestamp-date').textContent = data.last_updated_date;
            }
            const tbody = document.getElementById('raw-prices-tbody');
            tbody.innerHTML = '';
            for (const [ticker, price] of Object.entries(data.raw_prices)) {
                tbody.innerHTML += `<tr><td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05);">${ticker}</td><td style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); color:var(--neon);">${formatVND(price)}</td></tr>`;
            }
        }

        if (data.advanced_metrics) {
            document.getElementById('advanced-metrics-card').style.display = 'block';
            document.getElementById('metric-beta').textContent = data.advanced_metrics.beta != null ? data.advanced_metrics.beta.toFixed(2) : '--';
            document.getElementById('metric-sortino').textContent = data.advanced_metrics.sortino != null ? data.advanced_metrics.sortino.toFixed(2) : '--';
            document.getElementById('metric-treynor').textContent = data.advanced_metrics.treynor != null ? data.advanced_metrics.treynor.toFixed(4) : '--';
            document.getElementById('metric-rsq').textContent = data.advanced_metrics.r_squared != null ? data.advanced_metrics.r_squared.toFixed(2) : '--';
            document.getElementById('metric-calmar').textContent = data.advanced_metrics.calmar != null ? data.advanced_metrics.calmar.toFixed(2) : '--';
            document.getElementById('metric-mdd').textContent = data.advanced_metrics.max_drawdown != null ? (data.advanced_metrics.max_drawdown * 100).toFixed(2) + '%' : '--';
        }
        
        // --- Trading Signals ---
        if (data.trading_signals) {
            const signalsCard = document.getElementById('trading-signals-card');
            const signalsTbody = document.getElementById('trading-signals-tbody');
            if (signalsCard && signalsTbody) {
                signalsTbody.innerHTML = '';
                for (const [ticker, sig] of Object.entries(data.trading_signals)) {
                    let badgeClass = 'badge-hold';
                    if (sig.action.includes('BUY')) badgeClass = 'badge-buy';
                    else if (sig.action.includes('SELL')) badgeClass = 'badge-sell';
                    
                    signalsTbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 10px; font-weight: bold; color: white;">${ticker}</td>
                            <td style="padding: 10px;">
                                <span class="signal-badge ${badgeClass}">${sig.action}</span>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; max-width: 250px;">${sig.detail || ''}</div>
                            </td>
                            <td style="padding: 10px; color: var(--text-muted);">${sig.volume.toLocaleString('vi-VN')} CP<br><small style="font-size: 0.75rem;">@ ${formatVND(sig.price)}</small></td>
                            <td style="padding: 10px; text-align: right;">
                                <a href="${sig.broker_url}" target="_blank" class="btn-vps-cta">${I18N[currentLang]['btn_vps_cta']}</a>
                            </td>
                        </tr>
                    `;
                }
                signalsCard.style.display = 'block';
            }
        }
        
        const mc = data.monte_carlo;
        const values = mc.monetary_values;
        
        const displayCap = document.getElementById("display-capital");
        displayCap.style.transform = "scale(1.1)";
        displayCap.textContent = formatVND(values.expected_value);
        
        const ciText = document.getElementById("ci-text");
        ciText.textContent = `${I18N[currentLang]['ci_text']} [${formatVND(values.ci_lower_value)} -> ${formatVND(values.ci_upper_value)}]`;
        
        const displayRisk = document.getElementById("display-risk");
        const varLoss = values.var_value_loss;
        const varLossAbs = Math.abs(varLoss);
        if (varLoss >= 0) {
            // VaR dương: ở kịch bản xấu nhất 5%, danh mục vẫn có lãi
            displayRisk.textContent = varLossAbs < 1 ? I18N[currentLang]['var_profitable_label'] : "+" + formatVND(varLoss);
            displayRisk.style.color = "var(--neon-green)";
            displayRisk.title = I18N[currentLang]['var_positive_tooltip'];
        } else {
            // VaR âm: ở kịch bản xấu nhất 5%, danh mục bị lỗ
            const lossDisplay = varLossAbs < 1 ? "~0₫" : "-" + formatVND(varLossAbs);
            displayRisk.textContent = lossDisplay;
            displayRisk.style.color = "var(--neon-alert)";
            displayRisk.title = I18N[currentLang]['var_negative_tooltip'];
        }

        stressBtn.style.display = "inline-block";
        document.getElementById("stress-text").style.display = "none";
        
        apiStatus.textContent = I18N[currentLang]['status_connected'] + " (100%)";
        statusDot.style.background = "var(--neon-green)";
        statusDot.style.boxShadow = "0 0 8px var(--neon-green)";

        setTimeout(() => { displayCap.style.transform = "scale(1)"; }, 200);

        // --- Render Live News ---
        const newsCard = document.getElementById("live-news-card");
        const newsList = document.getElementById("live-news-list");
        const newsTickersLabel = document.getElementById("news-tickers-list");
        
        if (data.news_data && Object.keys(data.news_data).length > 0) {
            newsList.innerHTML = "";
            let fetchedTickers = [];
            for (const [t, newsArr] of Object.entries(data.news_data)) {
                if (newsArr.length > 0) {
                    fetchedTickers.push(t);
                    newsArr.forEach(nItem => {
                        const itemDiv = document.createElement("div");
                        itemDiv.style.background = "rgba(255,255,255,0.05)";
                        itemDiv.style.padding = "10px";
                        itemDiv.style.borderRadius = "6px";
                        itemDiv.style.borderLeft = "3px solid #00B8FF";
                        itemDiv.innerHTML = `
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 3px;">
                                <strong style="color: #00B8FF;">${t}</strong> • ${nItem.publishDate}
                            </div>
                            <div style="font-size: 0.9rem; color: white; font-weight: 500;">
                                ${nItem.title}
                            </div>
                        `;
                        newsList.appendChild(itemDiv);
                    });
                }
            }
            if (fetchedTickers.length > 0) {
                newsTickersLabel.textContent = fetchedTickers.join(", ");
                newsCard.style.display = "block";
            } else {
                newsCard.style.display = "none";
            }
        } else {
            newsCard.style.display = "none";
        }

        // --- NEW: Trigger AI Advice Automatically ---
        fetchAIAdvice(data);
    }

    async function fetchAIAdvice(data) {
        const aiCard = document.getElementById("ai-advice-card");
        const aiText = document.getElementById("ai-text");
        const aiLoading = document.getElementById("ai-loading");
        const aiBadge = document.getElementById("ai-badge");
        const aiBadgeText = document.getElementById("ai-badge-text");

        // Reset & Show Card
        aiCard.style.display = "block";
        aiText.innerHTML = "";
        aiLoading.style.display = "flex";
        aiBadge.classList.remove("done");
        aiBadgeText.textContent = I18N[currentLang]['ai_analyzing'];

        let manualBctcPayload = [];
        if (document.getElementById("manual-bctc-alert").style.display !== "none" && document.getElementById("use-manual-bctc-checkbox").checked) {
            manualBctcPayload = availableManualBCTC;
            aiBadgeText.textContent = "Gemini AI đang đọc BCTC chuyên sâu (RAG)...";
        }

        try {
            const response = await fetch('/api/ai-advice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    monte_carlo: data.monte_carlo,
                    stress_test: data.stress_test,
                    advanced_metrics: data.advanced_metrics,
                    fundamentals: data.fundamentals,
                    manual_bctc_tickers: manualBctcPayload,
                    news_data: data.news_data,
                    lang: currentLang
                })
            });

            if (!response.ok) throw new Error("AI API Error");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            aiLoading.style.display = "none";
            
            // Add typing cursor
            const cursor = document.createElement("span");
            cursor.className = "ai-cursor";
            aiText.appendChild(cursor);

            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                
                // Simple Markdown-ish formatting as we stream
                // Replacing **bold** and *italic* and newlines
                let formatted = fullText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');
                
                aiText.innerHTML = formatted;
                aiText.appendChild(cursor);
                
                // Auto-scroll to bottom if needed
                aiCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Finish
            cursor.remove();
            aiBadge.classList.add("done");
            aiBadgeText.textContent = I18N[currentLang]['ai_done'];
            
            // Hiện nút Download PDF
            document.getElementById('btn-export-pdf').style.display = 'inline-block';

        } catch (err) {
            console.error("AI Advice Error:", err);
            aiLoading.style.display = "none";
            aiText.innerHTML = `<span style="color: var(--neon-alert)">⚠️ Error: Không thể kết nối Gemini AI. Kiểm tra .env hoặc API Key.</span>`;
        }
    }

    // --- Giấy Phép / Export PDF Logic ---
    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            const element = document.getElementById('pdf-content-wrapper');
            const title = document.getElementById('pdf-report-title');
            
            // Hiện tiêu đề ẩn chuyên cho PDF
            title.style.display = 'block';
            
            // Tùy chỉnh Options cho HTML2PDF
            const opt = {
              margin:       [15, 15, 15, 15],
              filename:     `DNT_Quant_VIP_Report_${new Date().toISOString().split('T')[0]}.pdf`,
              image:        { type: 'jpeg', quality: 1 },
              html2canvas:  { 
                  scale: 2, 
                  useCORS: true, 
                  backgroundColor: '#0f172a',
                  windowWidth: 1024 // Đảm bảo html2canvas lấy được width hợp lý để ko bị bóp méo
              }, 
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Ép màu chữ trắng và background ciem để HTML2Canvas ko tự convert thành màu trắng xoá
            const originalColor = element.style.color;
            const originalBg = element.style.backgroundColor;
            const originalPadding = element.style.padding;
            
            element.style.color = '#cbd5e1';
            element.style.backgroundColor = '#0f172a';
            element.style.padding = '20px';

            // Trạng thái nút tải
            btnExportPdf.textContent = 'Đang render...';
            btnExportPdf.disabled = true;

            html2pdf().set(opt).from(element).save().then(() => {
                // Phục hồi lại state cũ
                title.style.display = 'none';
                element.style.color = originalColor;
                element.style.backgroundColor = originalBg;
                element.style.padding = originalPadding;
                
                btnExportPdf.textContent = '⬇️ Tải PDF';
                btnExportPdf.disabled = false;
            }).catch(err => {
                console.error("Lỗi xuất PDF: ", err);
                btnExportPdf.textContent = 'Lỗi Render! Thử lại';
                btnExportPdf.disabled = false;
                title.style.display = 'none';
            });
        });
    }

    function handleError(error) {
        console.error(error);
        apiStatus.textContent = I18N[currentLang]['err_conn'];
        statusDot.style.background = "var(--neon-alert)";
        statusDot.style.boxShadow = "0 0 8px var(--neon-alert)";
        document.getElementById('chart-container').innerHTML = `<p style="color: var(--neon-alert); text-align: center; margin-top: 50px;">${I18N[currentLang]['err_wait']}</p>`;
    }

    // --- RAG BCTC Checker ---
    const bctcAlert = document.getElementById("manual-bctc-alert");
    const bctcAlertTickers = document.getElementById("bctc-alert-tickers");
    let availableManualBCTC = [];

    async function evaluateTickersForManualBCTC() {
        let tickers = [];
        const activeNav = document.querySelector('.nav-item.active');
        if (!activeNav) return;

        if (activeNav.getAttribute('data-i18n') === 'nav_opt') {
            const raw = document.getElementById("tickers-input").value;
            tickers = raw.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
        } else if (activeNav.getAttribute('data-i18n') === 'nav_eval') {
            document.querySelectorAll('.t-input').forEach(input => {
                let val = input.value.trim().toUpperCase();
                if(val) tickers.push(val);
            });
        }
        
        if (tickers.length === 0) {
            bctcAlert.style.display = "none";
            availableManualBCTC = [];
            return;
        }

        try {
            const res = await fetch(`/api/check-manual-bctc?tickers=${tickers.join(',')}`);
            const data = await res.json();
            const matched = Object.keys(data);
            
            if (matched.length > 0) {
                availableManualBCTC = matched;
                bctcAlertTickers.textContent = matched.join(', ');
                bctcAlert.style.display = "block";
            } else {
                availableManualBCTC = [];
                bctcAlert.style.display = "none";
            }
        } catch (e) {
            console.error(e);
        }
    }

    document.getElementById("tickers-input").addEventListener("blur", evaluateTickersForManualBCTC);
    document.getElementById("holdings-list").addEventListener("blur", (e) => {
        if (e.target && e.target.classList.contains("t-input")) {
            evaluateTickersForManualBCTC();
        }
    }, true);


    // Execution Mode: Optimizer
    runBtn.addEventListener("click", () => {
        const rawCap = document.getElementById("capital-input").value.replace(/\./g, "");
        const capInput = parseFloat(rawCap);
        const retInput = parseFloat(document.getElementById("target-return").value) / 100;
        const tickersStr = document.getElementById("tickers-input").value;
        let tickersArray = tickersStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);

        if (isNaN(capInput) || isNaN(retInput) || tickersArray.length < 2) {
            alert(I18N[currentLang]['err_input']); return;
        }

        runBtn.textContent = I18N[currentLang]['loading_api']; runBtn.disabled = true;

        runBtn.textContent = I18N[currentLang]['loading_api']; runBtn.disabled = true;

        Promise.all([
            fetch('/api/run-simulation', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({capital: capInput, target_return: retInput, tickers: tickersArray, lang: currentLang})
            }).then(res => {
                if (!res.ok) throw new Error("Simulation API Error");
                return res.json();
            }),
            fetch(`/api/news?tickers=${tickersArray.join(',')}`).then(r => r.json()).catch(() => ({}))
        ])
        .then(([simData, newsData]) => {
            simData.news_data = newsData;
            handleApiResponse(simData);
        })
        .catch(handleError)
        .finally(() => { runBtn.textContent = I18N[currentLang]['btn_run']; runBtn.disabled = false; });
    });

    // Execution Mode: Evaluator
    evalBtn.addEventListener("click", () => {
        const rows = document.querySelectorAll(".holding-row");
        let holdings = {};
        for(let row of rows) {
            let t = row.querySelector('.t-input').value.trim().toUpperCase();
            let v = parseFloat(row.querySelector('.v-input').value);
            if(t && !isNaN(v)) holdings[t] = v;
        }

        const tf = parseInt(document.getElementById("timeframe-select").value);

        if (Object.keys(holdings).length === 0) {
            alert(I18N[currentLang]['err_input']); return;
        }

        evalBtn.textContent = I18N[currentLang]['loading_api']; evalBtn.disabled = true;

        evalBtn.textContent = I18N[currentLang]['loading_api']; evalBtn.disabled = true;

        Promise.all([
            fetch('/api/evaluate-portfolio', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({holdings: holdings, days: tf, lang: currentLang})
            }).then(res => {
                if (!res.ok) throw new Error("Evaluate API Error");
                return res.json();
            }),
            fetch(`/api/news?tickers=${Object.keys(holdings).join(',')}`).then(r => r.json()).catch(() => ({}))
        ])
        .then(([simData, newsData]) => {
            simData.news_data = newsData;
            handleApiResponse(simData);
        })
        .catch(handleError)
        .finally(() => { evalBtn.textContent = I18N[currentLang]['btn_eval']; evalBtn.disabled = false; });
    });

    // Stress Test Button
    stressBtn.addEventListener("click", () => {
        if (!latestSimulationData || !latestSimulationData.stress_test) return;
        const lossVnd = latestSimulationData.stress_test.estimated_loss_vnd;
        
        const stressText = document.getElementById("stress-text");
        stressText.style.display = "block";
        stressText.style.transform = "scale(1.1)";
        stressText.textContent = `${I18N[currentLang]['stress_drop']} -${formatVND(Math.abs(lossVnd))}`;
        
        setTimeout(() => { stressText.style.transform = "scale(1)"; }, 300);
    });

    // --- Financial Reports & SePay Paywall Logic ---
    let currentSessionId = localStorage.getItem('dnt_session_id');
    if (!currentSessionId) {
        currentSessionId = 'S' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('dnt_session_id', currentSessionId);
    }
    let pollingInterval = null;

    const finBtn = document.getElementById('fin-view-btn');
    if (finBtn) {
        finBtn.addEventListener('click', async () => {
            const ticker = document.getElementById('fin-ticker-input').value.trim();
            if (!ticker) return alert("Vui lòng nhập mã cổ phiếu!");
            
            finBtn.textContent = 'Fetching...';
            try {
                const res = await fetch(`/api/financials/${ticker}?session_id=${currentSessionId}`);
                const data = await res.json();
                
                if (data.error) throw new Error(data.error);

                document.getElementById('fin-report-card').style.display = 'block';
                document.getElementById('fin-ticker').textContent = data.ticker;
                document.getElementById('fin-pepb').textContent = `${data.pe.toFixed(2)} | ${data.pb.toFixed(2)}`;
                document.getElementById('fin-industry').textContent = data.industry || '--';
                document.getElementById('fin-marketcap').textContent = data.marketCap ? (data.marketCap).toLocaleString() : '--';
                
                // Fields
                document.getElementById('fin-roe').textContent = `${Number(data.roe).toFixed(2)}% | ${Number(data.roa).toFixed(2)}%`;
                document.getElementById('fin-debt').textContent = `${Number(data.debt_on_equity).toFixed(2)} Lần`;
                document.getElementById('fin-profit').textContent = `${Number(data.profit_growth).toFixed(2)}% (YoY)`;
                
            } catch (err) {
                alert(err.message);
            } finally {
                finBtn.textContent = I18N[currentLang]['btn_fetch_fin'];
            }
        });
    }
});
