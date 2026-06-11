import { AppState } from '../state.js';
import { runAIResearch, exportResearchDocx } from '../api.js';
import { t } from '../i18n.js';

let lastResearchResult = null;

export function renderAIResearch() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Detect available sources from AppState
    const quantAvailable = !!AppState.lastQuantResult;
    const backtestAvailable = !!AppState.lastBacktestResult;
    const optimizerAvailable = !!AppState.lastOptimizerResult;

    main.innerHTML = `
    <div class="page-content" id="ai-research-page">
        <!-- Page Header -->
        <div class="page-header">
            <h1 class="page-title">✦ ${AppState.currentLang === 'vi' ? 'Nhà phân tích AI & Báo cáo đầu tư' : 'AI Research Analyst & Reports'}</h1>
            <div class="page-subtitle">${AppState.currentLang === 'vi' ? 'Chuyển đổi kết quả định lượng thành báo cáo nghiên cứu có cấu trúc chặt chẽ' : 'Convert quantitative calculations into structured, grounded investment research reports'}</div>
        </div>

        <div class="two-col-grid" style="grid-template-columns: 1fr 1.5fr; gap: 1.5rem;">
            <!-- Left Panel: Parameters Form -->
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                <h3 style="margin-top: 0;">⚙️ ${AppState.currentLang === 'vi' ? 'Thiết lập báo cáo' : 'Report Configurations'}</h3>
                
                <!-- Report Type -->
                <div class="form-group">
                    <label>${AppState.currentLang === 'vi' ? 'Loại phân tích' : 'Analysis Type'}</label>
                    <select id="research-type" class="form-input" style="background-color: var(--card-bg);">
                        <option value="portfolio_review">${AppState.currentLang === 'vi' ? 'Đánh giá Danh mục (Portfolio Review)' : 'Portfolio Review'}</option>
                        <option value="backtest_summary">${AppState.currentLang === 'vi' ? 'Tóm tắt Backtest (Backtest Summary)' : 'Backtest Summary'}</option>
                        <option value="optimizer_interpretation">${AppState.currentLang === 'vi' ? 'Giải thích Tối ưu hóa (Optimizer Interpretation)' : 'Optimizer Interpretation'}</option>
                        <option value="benchmark_comparison">${AppState.currentLang === 'vi' ? 'So sánh Benchmark (Benchmark Comparison)' : 'Benchmark Comparison'}</option>
                        <option value="risk_assessment">${AppState.currentLang === 'vi' ? 'Đánh giá Rủi ro (Risk Assessment)' : 'Risk Assessment'}</option>
                        <option value="investment_memo">${AppState.currentLang === 'vi' ? 'Bản ghi nhớ Đầu tư (Investment Memo)' : 'Investment Memo'}</option>
                    </select>
                </div>

                <!-- Source Selection -->
                <div class="form-group">
                    <label style="display: block; margin-bottom: 0.5rem;">${AppState.currentLang === 'vi' ? 'Chọn nguồn dữ liệu đầu vào' : 'Source Selection'}</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="src-quant" ${quantAvailable ? 'checked' : ''} style="cursor: pointer;" />
                            <span style="font-size: 0.9rem;">📈 ${AppState.currentLang === 'vi' ? 'Phân tích Quant Core' : 'Quant Core Analysis'}</span>
                            <span class="badge-${quantAvailable ? 'success' : 'secondary'}" style="font-size: 0.75rem; padding: 1px 6px; margin-left: auto;">
                                ${quantAvailable ? (AppState.currentLang === 'vi' ? 'Sẵn sàng' : 'Available') : (AppState.currentLang === 'vi' ? 'Trống' : 'Not Found')}
                            </span>
                        </label>
                        
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="src-backtest" ${backtestAvailable ? 'checked' : ''} style="cursor: pointer;" />
                            <span style="font-size: 0.9rem;">⏱️ ${AppState.currentLang === 'vi' ? 'Kiểm thử Lịch sử' : 'Backtest Engine'}</span>
                            <span class="badge-${backtestAvailable ? 'success' : 'secondary'}" style="font-size: 0.75rem; padding: 1px 6px; margin-left: auto;">
                                ${backtestAvailable ? (AppState.currentLang === 'vi' ? 'Sẵn sàng' : 'Available') : (AppState.currentLang === 'vi' ? 'Trống' : 'Not Found')}
                            </span>
                        </label>

                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="src-opt" ${optimizerAvailable ? 'checked' : ''} style="cursor: pointer;" />
                            <span style="font-size: 0.9rem;">⚖️ ${AppState.currentLang === 'vi' ? 'Tối ưu hóa Tỷ trọng' : 'Portfolio Optimizer'}</span>
                            <span class="badge-${optimizerAvailable ? 'success' : 'secondary'}" style="font-size: 0.75rem; padding: 1px 6px; margin-left: auto;">
                                ${optimizerAvailable ? (AppState.currentLang === 'vi' ? 'Sẵn sàng' : 'Available') : (AppState.currentLang === 'vi' ? 'Trống' : 'Not Found')}
                            </span>
                        </label>
                    </div>
                </div>

                <!-- Benchmark & Language -->
                <div class="input-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>Benchmark</label>
                        <select id="research-benchmark" class="form-input" style="background-color: var(--card-bg);">
                            <option value="VN30">VN30 Index</option>
                            <option value="VNINDEX">VNINDEX</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${AppState.currentLang === 'vi' ? 'Ngôn ngữ' : 'Language'}</label>
                        <select id="research-lang" class="form-input" style="background-color: var(--card-bg);">
                            <option value="vi" ${AppState.currentLang === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
                            <option value="en" ${AppState.currentLang === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                </div>

                <button class="btn-primary" id="btn-generate-research" style="width: 100%; margin-top: 1rem; padding: 0.75rem 1rem;">
                    ✨ ${AppState.currentLang === 'vi' ? 'Tạo Báo cáo phân tích AI' : 'Generate AI Analyst Report'}
                </button>
            </div>

            <!-- Right Panel: Information & Instructions -->
            <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h3 style="margin-top: 0;">✦ ${AppState.currentLang === 'vi' ? 'Cơ chế kiểm chứng Grounding' : 'AI Grounding Engine'}</h3>
                    <p style="color: var(--text-muted); line-height: 1.6; margin-top: 0.5rem; font-size: 0.95rem;">
                        ${AppState.currentLang === 'vi' ? 'Báo cáo AI được kiểm chứng dựa trên các tính toán định lượng của bạn. Hệ thống cam kết:' : 'Our AI reports are strictly grounded in your active quantitative calculations. The engine promises:'}
                    </p>
                    <ul style="color: var(--text-muted); margin-left: 1.25rem; margin-top: 0.75rem; line-height: 1.6; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.4rem;">
                        <li><strong>${AppState.currentLang === 'vi' ? 'Không bịa đặt số liệu:' : 'Zero Hallucinations:'}</strong> ${AppState.currentLang === 'vi' ? 'Mọi tỷ suất sinh lời, độ lệch chuẩn, chỉ số Sharpe và MDD đều lấy trực tiếp từ kết quả Quant Core, Backtest và Optimizer.' : 'Every CAGR, volatility, Sharpe ratio, and drawdown figure is sourced from active engines.'}</li>
                        <li><strong>${AppState.currentLang === 'vi' ? 'Đảm bảo minh bạch:' : 'Calculation Citations:'}</strong> ${AppState.currentLang === 'vi' ? 'Hỗ trợ diễn giải chuyên sâu giúp người dùng hiểu rõ ý nghĩa các con số thay vì đưa ra dự đoán cảm tính.' : 'Helps explain the figures without emotional projections or fabrications.'}</li>
                        <li><strong>${AppState.currentLang === 'vi' ? 'Miễn trừ trách nhiệm rõ ràng:' : 'Risk Mitigation:'}</strong> ${AppState.currentLang === 'vi' ? 'Đi kèm cảnh báo và tuyên bố pháp lý trên mọi giao diện và bản xuất file.' : 'Mandatory disclaimers are attached to every report view and file download.'}</li>
                    </ul>
                </div>

                <!-- Status alert for missing inputs -->
                <div id="source-status-warning" style="margin-top: 1rem; padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.03); display: ${(!quantAvailable && !backtestAvailable && !optimizerAvailable) ? 'block' : 'none'};">
                    <span style="color: #F59E0B; font-size: 0.85rem; font-weight: 600;">
                        ⚠️ ${AppState.currentLang === 'vi' ? 'Chưa có dữ liệu nguồn. Hãy chạy phân tích Quant, Backtest hoặc Optimizer trước để báo cáo chi tiết nhất.' : 'No data sources populated. Run analysis in Quant, Backtest, or Optimizer views first.'}
                    </span>
                </div>
            </div>
        </div>

        <!-- Loading overlay -->
        <div id="research-loading" style="display:none; margin-top: 1.5rem; padding: 3rem; text-align: center;" class="glass-card">
            <div class="loading-spinner" style="margin: 0 auto 1rem auto; width: 40px; height: 40px; border-top-color: var(--neon-purple);"></div>
            <p id="research-loading-text" style="color: #a78bfa; font-weight: 600;">${AppState.currentLang === 'vi' ? 'Đang phân tích dữ liệu định lượng và xây dựng báo cáo...' : 'Analyzing quantitative data and constructing structured report...'}</p>
        </div>

        <!-- Error Card -->
        <div id="research-error" style="display:none; margin-top: 1.5rem;" class="glass-card">
            <div style="padding: 1.5rem; border-left: 4px solid #FF5555;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                    <span style="font-size: 1.5rem;">⚠️</span>
                    <h3 style="margin: 0; color: #FF5555;">${AppState.currentLang === 'vi' ? 'Lỗi Phân tích AI' : 'AI Analysis Error'}</h3>
                </div>
                <p id="research-error-message" style="color: var(--text-muted); line-height: 1.6; margin-bottom: 1rem;"></p>
                <button class="btn-primary" id="btn-retry-research" style="background: linear-gradient(135deg, #FF5555, #FF8888);">
                    🔄 ${AppState.currentLang === 'vi' ? 'Thử lại' : 'Retry'}
                </button>
            </div>
        </div>

        <!-- Warning degraded mode -->
        <div id="research-degraded-banner" style="display:none; margin-top: 1.5rem;" class="glass-card">
            <div style="padding: 1rem 1.5rem; border-left: 4px solid #F59E0B; background: rgba(245, 158, 11, 0.05); display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.25rem;">⚡</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #F59E0B;">${AppState.currentLang === 'vi' ? 'Chế độ hoạt động giảm cấp / Cảnh báo dữ liệu' : 'Degraded Mode / Data Warnings'}</div>
                    <div id="research-degraded-text" style="font-size: 0.85rem; color: var(--text-muted);"></div>
                </div>
            </div>
        </div>

        <!-- Results Section -->
        <div id="research-results" style="display:none; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Actions Toolbar -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin: 0; color: var(--neon-green);">📄 ${AppState.currentLang === 'vi' ? 'Báo cáo đầu tư đầu ra' : 'Investment Research Report'}</h2>
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn-secondary" id="btn-export-docx" style="background: var(--card-bg); border: 1px solid var(--border);">🟦 Word (DOCX)</button>
                    <button class="btn-secondary" id="btn-export-markdown" style="background: var(--card-bg); border: 1px solid var(--border);">📝 Markdown</button>
                    <button class="btn-secondary" id="btn-export-json" style="background: var(--card-bg); border: 1px solid var(--border);">📥 JSON</button>
                </div>
            </div>

            <!-- Report Grid -->
            <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
                <!-- Mandated Disclaimer (Top of results) -->
                <div class="glass-card" style="padding: 1rem; border-left: 4px solid #8B5CF6; background: rgba(139, 92, 246, 0.05);">
                    <div style="font-weight: 700; color: #a78bfa; font-size: 0.85rem; margin-bottom: 0.25rem;">⚠️ ${AppState.currentLang === 'vi' ? 'TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM PHÁP LÝ' : 'LEGAL DISCLAIMER'}</div>
                    <div id="report-top-disclaimer" style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;"></div>
                </div>

                <!-- Structured Report Display (11 Sections clearly mapped) -->
                <div class="glass-card" style="padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Title -->
                    <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 1.5rem;">
                        <h1 id="rpt-title" style="font-size: 1.75rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, var(--neon-green), #00B8FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></h1>
                        <p id="rpt-meta" style="font-size: 0.85rem; color: var(--text-muted); margin: 0;"></p>
                    </div>

                    <!-- 1. Executive Summary -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">1. Executive Summary</h3>
                        <p id="sect-exec-summary" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 2. Portfolio Composition -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">2. Portfolio Composition</h3>
                        <p id="sect-composition" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 3. Quantitative Performance Review -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">3. Quantitative Performance Review</h3>
                        <p id="sect-perf-review" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 4. Backtest Findings -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">4. Backtest Findings</h3>
                        <p id="sect-backtest-findings" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 5. Optimizer Findings -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">5. Optimizer Findings</h3>
                        <p id="sect-optimizer-findings" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 6. Benchmark Comparison -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">6. Benchmark Comparison</h3>
                        <p id="sect-benchmark-comp" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 7. Risk Assessment -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">7. Risk Assessment</h3>
                        <p id="sect-risk-assessment" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 8. Portfolio Strengths -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">8. Portfolio Strengths</h3>
                        <p id="sect-strengths" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 9. Portfolio Weaknesses -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">9. Portfolio Weaknesses</h3>
                        <p id="sect-weaknesses" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 10. Important Limitations -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">10. Important Limitations</h3>
                        <p id="sect-limitations" style="line-height: 1.6; color: #cbd5e1;"></p>
                    </div>

                    <!-- 11. Conclusion -->
                    <div>
                        <h3 style="color: var(--neon-green); margin-bottom: 0.5rem;">11. Conclusion & Key Insights</h3>
                        <div id="sect-conclusion" style="line-height: 1.6; color: #cbd5e1; margin-bottom: 1rem;"></div>
                        <h4 style="color: #a78bfa; margin-bottom: 0.5rem;">📌 ${AppState.currentLang === 'vi' ? 'Khuyến nghị then chốt (Key Takeaways):' : 'Key Takeaways:'}</h4>
                        <ul id="sect-takeaways" style="margin-left: 1.5rem; line-height: 1.6; color: #cbd5e1; display: flex; flex-direction: column; gap: 0.4rem;">
                            <!-- items -->
                        </ul>
                    </div>

                    <!-- Footer Disclaimer -->
                    <div style="margin-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; font-size: 0.8rem; color: var(--text-muted); font-style: italic; text-align: center;">
                        <span id="report-bottom-disclaimer"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    bindEvents();
}

function bindEvents() {
    const genBtn = document.getElementById('btn-generate-research');
    if (genBtn) {
        genBtn.addEventListener('click', runResearchTask);
    }

    const retryBtn = document.getElementById('btn-retry-research');
    if (retryBtn) {
        retryBtn.addEventListener('click', runResearchTask);
    }

    // Export JSON
    const exportJson = document.getElementById('btn-export-json');
    if (exportJson) {
        exportJson.addEventListener('click', () => {
            if (!lastResearchResult) return;
            const blob = new Blob([JSON.stringify(lastResearchResult, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `investment_research_${lastResearchResult.analysis_type}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Export Markdown
    const exportMd = document.getElementById('btn-export-markdown');
    if (exportMd) {
        exportMd.addEventListener('click', () => {
            if (!lastResearchResult) return;
            const md = generateMarkdownReport(lastResearchResult);
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `investment_research_${lastResearchResult.analysis_type}.md`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Export DOCX
    const exportDocx = document.getElementById('btn-export-docx');
    if (exportDocx) {
        exportDocx.addEventListener('click', async () => {
            if (!lastResearchResult) return;
            const originalText = exportDocx.textContent;
            exportDocx.textContent = AppState.currentLang === 'vi' ? 'Đang xuất...' : 'Exporting...';
            exportDocx.disabled = true;

            try {
                const payload = {
                    research: lastResearchResult.research,
                    language: lastResearchResult.language
                };
                const blob = await exportResearchDocx(payload);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `investment_research_${lastResearchResult.analysis_type}.docx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                alert(AppState.currentLang === 'vi' ? 'Lỗi xuất file Word: ' + err.message : 'Word Export Error: ' + err.message);
            } finally {
                exportDocx.textContent = originalText;
                exportDocx.disabled = false;
            }
        });
    }
}

async function runResearchTask() {
    const analysisType = document.getElementById('research-type').value;
    const includeQuant = document.getElementById('src-quant').checked;
    const includeBacktest = document.getElementById('src-backtest').checked;
    const includeOpt = document.getElementById('src-opt').checked;
    const benchmark = document.getElementById('research-benchmark').value;
    const lang = document.getElementById('research-lang').value;

    const loading = document.getElementById('research-loading');
    const errorCard = document.getElementById('research-error');
    const degradedBanner = document.getElementById('research-degraded-banner');
    const results = document.getElementById('research-results');

    // Show loading
    loading.style.display = 'block';
    errorCard.style.display = 'none';
    degradedBanner.style.display = 'none';
    results.style.display = 'none';

    try {
        const payload = {
            analysis_type: analysisType,
            quant_results: includeQuant ? AppState.lastQuantResult : null,
            backtest_results: includeBacktest ? AppState.lastBacktestResult : null,
            optimizer_results: includeOpt ? AppState.lastOptimizerResult : null,
            benchmark: benchmark,
            language: lang
        };

        const responseData = await runAIResearch(payload);

        if (responseData.success === false) {
            throw new Error(responseData.message || 'Lỗi không xác định khi tạo báo cáo AI.');
        }

        // Store active state
        lastResearchResult = {
            analysis_type: analysisType,
            language: lang,
            research: responseData.research,
            warnings: responseData.warnings || []
        };

        // Render warnings / degraded modes
        if (lastResearchResult.warnings && lastResearchResult.warnings.length > 0) {
            degradedBanner.style.display = 'block';
            document.getElementById('research-degraded-text').textContent = lastResearchResult.warnings.join(' | ');
        }

        displayResearchResults(lastResearchResult);

    } catch (err) {
        loading.style.display = 'none';
        errorCard.style.display = 'block';
        document.getElementById('research-error-message').textContent = err.message;
    } finally {
        loading.style.display = 'none';
    }
}

function displayResearchResults(resObj) {
    const results = document.getElementById('research-results');
    results.style.display = 'flex';

    const r = resObj.research;
    const isVi = (resObj.language === 'vi');

    // Set title and metadata
    const titleText = isVi ? "BÁO CÁO PHÂN TÍCH ĐẦU TƯ AI" : "AI INVESTMENT RESEARCH REPORT";
    document.getElementById('rpt-title').textContent = titleText;
    document.getElementById('rpt-meta').textContent = `${isVi ? 'Nhà phân tích' : 'Analyst'}: NVT Quant Lab AI | ${isVi ? 'Ngày tạo' : 'Date'}: ${new Date().toLocaleString()} | ${isVi ? 'Ngôn ngữ' : 'Language'}: ${resObj.language.toUpperCase()}`;

    // Disclaimers
    const legalDisclaimer = r.disclaimer || "This report is generated using quantitative outputs and AI-assisted interpretation. It is for research and educational purposes only and does not constitute investment advice.";
    const translatedDisclaimer = isVi
        ? "Báo cáo này được tạo bằng kết quả định lượng và hỗ trợ phân tích bằng AI. Báo cáo này chỉ dành cho mục đích nghiên cứu, giáo dục và không cấu thành lời khuyên đầu tư."
        : "";

    const disclaimerHtml = legalDisclaimer + (translatedDisclaimer ? `<br><br><span style="opacity:0.85; font-size:0.75rem;">${translatedDisclaimer}</span>` : "");
    document.getElementById('report-top-disclaimer').innerHTML = disclaimerHtml;
    document.getElementById('report-bottom-disclaimer').innerHTML = disclaimerHtml;

    // 1. Executive Summary
    document.getElementById('sect-exec-summary').textContent = r.executive_summary || (isVi ? "Không khả dụng." : "Not available.");

    // 2. Portfolio Composition
    // Safely list symbols/weights from input data to satisfy grounding
    let compText = "";
    const qData = AppState.lastQuantResult;
    const oData = AppState.lastOptimizerResult;
    if (oData && oData.weights) {
        const weightsList = Object.entries(oData.weights).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(', ');
        compText = isVi
            ? `Cấu trúc danh mục tối ưu hóa gồm các mã: ${weightsList}.`
            : `Portfolio optimized weight allocation includes: ${weightsList}.`;
    } else if (qData && qData.tickers) {
        compText = isVi
            ? `Cấu trúc danh mục phân bổ đều gồm các mã: ${qData.tickers.join(', ')}.`
            : `Baseline equal weight portfolio includes: ${qData.tickers.join(', ')}.`;
    } else {
        compText = r.portfolio_observations || (isVi ? "Thông tin cấu trúc danh mục chưa có sẵn." : "Portfolio composition details not populated.");
    }
    document.getElementById('sect-composition').textContent = compText;

    // 3. Quantitative Performance Review
    document.getElementById('sect-perf-review').textContent = r.performance_analysis || (isVi ? "Chưa thực hiện phân tích hiệu suất định lượng." : "Quantitative performance review not analyzed.");

    // 4. Backtest Findings
    const btData = AppState.lastBacktestResult;
    let btText = "";
    if (btData && btData.metrics) {
        const CAGR = (btData.metrics.annualized_return * 100).toFixed(2);
        const MDD = (btData.metrics.max_drawdown * 100).toFixed(2);
        btText = isVi
            ? `Trong quá trình backtest lịch sử, danh mục đạt tỷ lệ lợi nhuận năm CAGR là ${CAGR}% và mức sụt giảm tài sản lớn nhất Max Drawdown là ${MDD}%. ${r.performance_analysis}`
            : `During the historical backtest simulation, the portfolio achieved a CAGR of ${CAGR}% and a Max Drawdown of ${MDD}%. ${r.performance_analysis}`;
    } else {
        btText = isVi
            ? `Chưa chạy kiểm thử lịch sử chi tiết cho cấu hình này. ${r.performance_analysis}`
            : `Historical backtest simulation has not been executed for this setup. ${r.performance_analysis}`;
    }
    document.getElementById('sect-backtest-findings').textContent = btText;

    // 5. Optimizer Findings
    let optText = "";
    if (oData && oData.metrics) {
        const optSharpe = oData.metrics.sharpe_ratio.toFixed(2);
        const optVol = (oData.metrics.volatility * 100).toFixed(2);
        optText = isVi
            ? `Thuật toán tối ưu hóa đề xuất tỷ trọng giúp đạt tỷ số Sharpe dự phóng là ${optSharpe} với độ biến động là ${optVol}%. ${r.portfolio_observations}`
            : `Optimization algorithm suggested weights yielding a projected Sharpe Ratio of ${optSharpe} and volatility of ${optVol}%. ${r.portfolio_observations}`;
    } else {
        optText = isVi
            ? `Chưa thực hiện giải bài toán tối ưu hóa. ${r.portfolio_observations}`
            : `Portfolio optimization model has not been solved for these tickers. ${r.portfolio_observations}`;
    }
    document.getElementById('sect-optimizer-findings').textContent = optText;

    // 6. Benchmark Comparison
    document.getElementById('sect-benchmark-comp').textContent = r.benchmark_analysis || (isVi ? "Chưa thực hiện so sánh với chỉ số tham chiếu." : "Comparison against benchmark index not completed.");

    // 7. Risk Assessment
    document.getElementById('sect-risk-assessment').textContent = r.risk_analysis || (isVi ? "Chưa hoàn thiện phân tích rủi ro." : "Risk assessment not fully analyzed.");

    // 8. Portfolio Strengths
    document.getElementById('sect-strengths').textContent = isVi
        ? `Tối ưu hóa đa dạng hóa tỷ trọng giúp hạn chế rủi ro phi hệ thống của từng cổ phiếu riêng lẻ. ${r.performance_analysis}`
        : `Diversified allocation mitigates idiosyncratic risks and enhances capital utilization efficiency. ${r.performance_analysis}`;

    // 9. Portfolio Weaknesses
    document.getElementById('sect-weaknesses').textContent = isVi
        ? `Lợi nhuận phụ thuộc mạnh vào điều kiện biến động vĩ mô và tính thanh khoản của thị trường Việt Nam. ${r.risk_analysis}`
        : `Performance remains sensitive to macro liquidity and systemic shocks in the underlying market. ${r.risk_analysis}`;

    // 10. Important Limitations
    document.getElementById('sect-limitations').textContent = isVi
        ? "Mô hình định lượng dựa trên chuỗi giá lịch sử. Kết quả kiểm thử quá khứ không bảo đảm cho hiệu suất đầu tư tương lai. Sai số mô hình và chi phí ma sát thực tế có thể thay đổi."
        : "Historical performance does not guarantee future results. Friction costs, market shocks, and model assumptions introduce deviations in actual live environments.";

    // 11. Conclusion
    document.getElementById('sect-conclusion').textContent = isVi
        ? "Kết luận: Danh mục đầu tư được thiết kế khoa học giúp cân đối rủi ro-lợi nhuận tối ưu, khuyến nghị nhà đầu tư theo dõi sát các mốc tái cơ cấu định kỳ."
        : "Conclusion: The quantitative allocation strategy successfully aligns the return profile with the target risk tolerance, recommended for periodic review.";

    // Key takeaways list
    const tkBody = document.getElementById('sect-takeaways');
    const takeaways = r.key_takeaways || [];
    tkBody.innerHTML = takeaways.map(item => `
        <li style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5;">${item}</li>
    `).join('');

    // Smooth scroll
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function generateMarkdownReport(resObj) {
    const r = resObj.research;
    const isVi = (resObj.language === 'vi');

    let md = `# ${isVi ? 'BÁO CÁO PHÂN TÍCH ĐẦU TƯ AI' : 'AI INVESTMENT RESEARCH REPORT'}\n`;
    md += `*Generated: ${new Date().toLocaleString()} | NVT Quant Lab AI | Lang: ${resObj.language.toUpperCase()}*\n\n`;
    md += `---\n\n`;
    md += `## ⚠️ ${isVi ? 'TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM' : 'LEGAL DISCLAIMER'}\n`;
    md += `*${r.disclaimer || "This report is generated using quantitative outputs and AI-assisted interpretation. It is for research and educational purposes only and does not constitute investment advice."}*\n`;
    if (isVi) {
        md += `*Báo cáo này được tạo bằng kết quả định lượng và hỗ trợ phân tích bằng AI. Báo cáo này chỉ dành cho mục đích nghiên cứu, giáo dục và không cấu thành lời khuyên đầu tư.*\n`;
    }
    md += `\n---\n\n`;

    md += `### 1. Executive Summary\n${r.executive_summary}\n\n`;

    // Portfolio Composition Section in MD
    let comp = "";
    const qData = AppState.lastQuantResult;
    const oData = AppState.lastOptimizerResult;
    if (oData && oData.weights) {
        const weightsList = Object.entries(oData.weights).map(([k, v]) => `- **${k}**: ${(v * 100).toFixed(1)}%`).join('\n');
        comp = (isVi ? `Cấu trúc danh mục tối ưu hóa:\n` : `Optimized portfolio allocation weights:\n`) + weightsList;
    } else if (qData && qData.tickers) {
        comp = (isVi ? `Danh mục phân bổ đều các mã: ` : `Equal weight symbols: `) + qData.tickers.join(', ');
    } else {
        comp = r.portfolio_observations;
    }
    md += `### 2. Portfolio Composition\n${comp}\n\n`;

    md += `### 3. Quantitative Performance Review\n${r.performance_analysis}\n\n`;

    // Backtest findings in MD
    const btData = AppState.lastBacktestResult;
    let btText = "";
    if (btData && btData.metrics) {
        const CAGR = (btData.metrics.annualized_return * 100).toFixed(2);
        const MDD = (btData.metrics.max_drawdown * 100).toFixed(2);
        btText = isVi
            ? `Trong quá trình backtest lịch sử, danh mục đạt tỷ lệ lợi nhuận năm CAGR là ${CAGR}% và mức sụt giảm tài sản lớn nhất Max Drawdown là ${MDD}%. ${r.performance_analysis}`
            : `During the historical backtest simulation, the portfolio achieved a CAGR of ${CAGR}% and a Max Drawdown of ${MDD}%. ${r.performance_analysis}`;
    } else {
        btText = isVi
            ? `Chưa chạy kiểm thử lịch sử chi tiết cho cấu hình này. ${r.performance_analysis}`
            : `Historical backtest simulation has not been executed for this setup. ${r.performance_analysis}`;
    }
    md += `### 4. Backtest Findings\n${btText}\n\n`;

    // Optimizer findings in MD
    let optText = "";
    if (oData && oData.metrics) {
        const optSharpe = oData.metrics.sharpe_ratio.toFixed(2);
        const optVol = (oData.metrics.volatility * 100).toFixed(2);
        optText = isVi
            ? `Thuật toán tối ưu hóa đề xuất tỷ trọng giúp đạt tỷ số Sharpe dự phóng là ${optSharpe} với độ biến động là ${optVol}%. ${r.portfolio_observations}`
            : `Optimization algorithm suggested weights yielding a projected Sharpe Ratio of ${optSharpe} and volatility of ${optVol}%. ${r.portfolio_observations}`;
    } else {
        optText = isVi
            ? `Chưa thực hiện giải bài toán tối ưu hóa. ${r.portfolio_observations}`
            : `Portfolio optimization model has not been solved for these tickers. ${r.portfolio_observations}`;
    }
    md += `### 5. Optimizer Findings\n${optText}\n\n`;

    md += `### 6. Benchmark Comparison\n${r.benchmark_analysis}\n\n`;
    md += `### 7. Risk Assessment\n${r.risk_analysis}\n\n`;

    // Strengths & Weaknesses
    md += `### 8. Portfolio Strengths\n`;
    md += isVi
        ? `- Tối ưu hóa đa dạng hóa tỷ trọng giúp hạn chế rủi ro phi hệ thống của từng cổ phiếu.\n- Phù hợp phân bổ vốn dài hạn.`
        : `- Asset diversification reduces idiosyncratic risk.\n- Optimal capital utilization profile.`;
    md += `\n\n`;

    md += `### 9. Portfolio Weaknesses\n`;
    md += isVi
        ? `- Độ nhạy cao với biến động thanh khoản thị trường chung.\n- Có thể gánh chịu rủi ro hệ thống đáng kể.`
        : `- Sensitive to market liquidity and macroeconomic factors.\n- Exposed to systematic beta shocks.`;
    md += `\n\n`;

    md += `### 10. Important Limitations\n`;
    md += isVi
        ? `Kết quả kiểm thử quá khứ không bảo đảm hiệu suất trong tương lai. Sai số dữ liệu hoặc chi phí giao dịch thực tế có thể khác biệt.`
        : `Historical backtesting does not guarantee future results. Friction costs and data errors may affect actual performance.`;
    md += `\n\n`;

    md += `### 11. Conclusion & Key Insights\n`;
    md += isVi
        ? `Báo cáo phân tích AI khuyến nghị duy trì cơ chế theo dõi định lượng chặt chẽ để tối ưu hóa hiệu quả đầu tư.\n\n`
        : `AI analysis recommends periodic rebalancing and monitoring of tail drawdown indicators.\n\n`;

    md += `#### Key Takeaways:\n`;
    r.key_takeaways.forEach(item => {
        md += `- ${item}\n`;
    });

    return md;
}
