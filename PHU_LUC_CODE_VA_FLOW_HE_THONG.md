# PHỤ LỤC: PHÂN TÍCH CODE VÀ LUỒNG DỮ LIỆU HỆ THỐNG
## TÀI LIỆU CHI TIẾT DÙNG CHO CÂU HỎI PHẢN BIỆN VÀ TRA CỨU CODE LÕI

---

# MỤC LỤC
1. [BẢNG MAP HỆ THỐNG (CODE MAPPING MATRIX)](#1-bang-map-he-thong-code-mapping-matrix)
2. [DANH SÁCH FILE TRÌNH BÀY THEO THỨ TỰ THUYẾT TRÌNH](#2-danh-sach-file-trinh-bay-theo-thu-tu-thuyet-trinh)
3. [BẢN ĐỒ DỮ LIỆU CƠ SỞ DỮ LIỆU (DATABASE MAP)](#3-ban-do-du-lieu-co-so-du-lieu-database-map)
4. [ÁNH XẠ CÔNG THỨC TOÁN HỌC VÀO SOURCE CODE](#4-anh-xa-cong-thuc-toan-hoc-vao-source-code)
5. [30 CÂU HỎI PHẢN BIỆN VÀ TRẢ LỜI CHO GIẢNG VIÊN](#5-30-cau-hoi-phan-bien-va-tra-loi-cho-giang-vien)
6. [BẢNG TRẠNG THÁI VÀ HẠN CHẾ CỦA HỆ THỐNG](#6-bang-trang-thai-va-han-che-cua-he-thong)

---

# 1. BẢNG MAP HỆ THỐNG (CODE MAPPING MATRIX)

| Trang/Chức năng | Frontend file | API Endpoint | Router | Service/Core | Model/Database | Nguồn ngoài | Output chính |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Đăng ký (Register)** | [Auth.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Auth.js) | `/api/auth/register` | [auth.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/auth.py) | [auth_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/auth_service.py) | `dbo.Users` | Không | Tạo tài khoản, lưu mật khẩu băm bcrypt |
| **Đăng nhập (Login)** | [Auth.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Auth.js) | `/api/auth/token` | [auth.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/auth.py) | [auth_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/auth_service.py) | `dbo.Users`, `dbo.RefreshTokens` | Không | Trả về Access Token (JWT) và Refresh Token |
| **Dashboard (Hiệu suất danh mục)** | [Dashboard.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Dashboard.js) | `/api/portfolios/{id}/performance` | [performance.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/performance.py) | [performance_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/performance_service.py) | `dbo.PortfolioSnapshots` | Không | Vẽ biểu đồ tài sản ròng ròng lịch sử, tổng lãi lỗ |
| **Quản lý Danh mục (Portfolios)** | [Portfolio.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Portfolio.js) | `/api/portfolios` | [portfolios.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/portfolios.py) | [portfolio_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/portfolio_service.py) | `dbo.Portfolios` | Không | Tạo, sửa, xóa danh mục đầu tư |
| **Quản lý Giao dịch (Transactions)** | [Portfolio.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Portfolio.js) | `/api/portfolios/{id}/transactions` | [portfolios.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/portfolios.py) | [portfolio_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/portfolio_service.py) | `dbo.Transactions` | Không | Thêm, sửa, xóa giao dịch. Trigger snapshot mới |
| **Bảng số dư tài sản (Holdings)** | [Portfolio.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Portfolio.js) | `/api/portfolios/{id}/holdings` | [portfolios.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/portfolios.py) | [portfolio_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/portfolio_service.py) | `dbo.Transactions` | Entrade API | Tính toán khối lượng nắm giữ, giá vốn bình quân, định giá thị trường |
| **Phân tích Rủi ro (Risk Analysis)** | [RiskAnalysis.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/RiskAnalysis.js) | `/api/run-simulation` | [main.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/main.py) | [portfolio_opt.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/portfolio_opt.py), [backtester.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/backtester.py) | Không | Entrade EOD & Realtime API | Biểu đồ Efficient Frontier, Tỷ trọng tối ưu, stress test, tín hiệu SMA, backtest |
| **Đánh giá Danh mục (Evaluator)** | [RiskAnalysis.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/RiskAnalysis.js) | `/api/evaluate-portfolio` | [main.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/main.py) | [portfolio_opt.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/portfolio_opt.py) | Không | Entrade API | Đánh giá phân bổ tài sản hiện tại, kiểm thử lịch sử thực tế, stress test |
| **Quant App (Định lượng nhanh)** | [Quant.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Quant.js) | `/api/quant/analyze` | [quant.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/quant.py) | [portfolio_opt.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/portfolio_opt.py) | Không | Entrade API | Chỉ số rủi ro nâng cao (Sortino, Treynor, Calmar, Beta), ma trận tương quan Heatmap, Equity Curve, Drawdown |
| **Tối ưu hóa Quant (Optimizer)** | [Optimizer.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Optimizer.js) | `/api/quant/optimize`, `/api/quant/optimize-and-backtest` | [optimize.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/optimize.py) | [optimizer_engine.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/optimizer_engine.py), [quant_math.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/quant_math.py) | Không | Entrade API | Trọng số tối ưu hóa (Max Sharpe, Min Var, Risk Parity, Mean-Variance...), Efficient Frontier, Risk Contribution, Rebalancing Backtest |
| **Kiểm thử chiến lược (Backtest)** | [Backtest.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Backtest.js) | `/api/quant/backtest` | [backtest.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/backtest.py) | [backtest_engine.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/backtest_engine.py) | Không | Entrade API | Equity curve chiến lược vs VN30/VNINDEX, các chỉ số Sortino, Beta, Max Drawdown |
| **Tối ưu Black-Litterman** | [Optimization.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/Optimization.js) | `/api/optimization/optimize` | [optimization.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/optimization.py) | [optimization_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/optimization_service.py), [black_litterman.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/black_litterman.py) | Không | Entrade API | So sánh Prior vs Posterior returns, tính trọng số mới dựa trên góc nhìn người dùng |
| **Cố vấn AI (AI Assistant)** | [AIAssistant.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/AIAssistant.js) | `/api/ai-advice` | [main.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/main.py) | [ai_advisor.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/ai_advisor.py), [chat_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/chat_service.py) | `dbo.ChatThreads`, `dbo.ChatMessages` | Gemini API | Stream văn bản tư vấn và lưu trữ đoạn hội thoại |
| **Báo cáo định lượng AI (AI Analyst)** | [AIResearch.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/AIResearch.js) | `/api/ai/research` | [ai_research.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/ai_research.py) | [research_generator.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/research_generator.py) | Không | Gemini API | Báo cáo cấu trúc (Executive Summary, Risk, Performance) dạng JSON |
| **Xuất file Word (Export docx)** | [AIResearch.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/AIResearch.js) | `/api/ai/research/export-docx` | [ai_research.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/ai_research.py) | [research_generator.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/research_generator.py) | Không | Thư viện `python-docx` | File Word (.docx) được stream nhị phân tải trực tiếp về thiết bị |
| **Kiểm tra giám sát hệ thống (Ops)** | [OpsDashboard.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/views/OpsDashboard.js) | `/api/health/dependencies` | [health.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/api/routers/health.py) | [system_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/system_service.py) | `dbo.AuditLogs`, `dbo.Users` | API kiểm tra kết nối ngoài | Trả về tài nguyên RAM/CPU, độ trễ database, trạng thái API dữ liệu thị trường |

---

# 2. DANH SÁCH FILE TRÌNH BÀY THEO THỨ TỰ THUYẾT TRÌNH

1.  **[main.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/main.py)**: Khởi tạo ứng dụng FastAPI, cấu hình CORS, tích hợp Middleware giám sát hiệu năng, đăng ký toàn bộ 12 router và định nghĩa luồng API mô phỏng tích hợp `/api/run-simulation`. *Mở đầu tiên để chỉ ra cấu trúc backend.*
2.  **[router.js](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/frontend/js/router.js)**: Lớp điều hướng SPA (Single Page Application) sử dụng cơ chế băm `hashchange`. Cấu hình lớp Guard xác thực dựa trên token JWT. *Mở khi giới thiệu về Frontend.*
3.  **[session.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/db/session.py)**: Thiết lập SQLAlchemy engine kết nối SQL Server dựa trên biến cấu hình. *Mở khi giải thích kết nối cơ sở dữ liệu.*
4.  **[transaction.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/models/transaction.py)**: Định nghĩa bảng `dbo.Transactions` lưu trữ các trường dữ liệu giao dịch gốc. *Mở khi giải thích về cấu trúc lưu trữ.*
5.  **[portfolio_service.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/portfolio_service.py)**: Chứa hàm `get_portfolio_holdings` tính toán dồn số dư tài sản (Average Cost Basis). *Mở khi giải thích thuật toán tổng hợp số dư.*
6.  **[vnstock_provider.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/vnstock_provider.py)**: Chứa logic kéo dữ liệu lịch sử giá OHLCV từ nguồn Entrade API. *Mở khi giải thích luồng dữ liệu đầu vào.*
7.  **[quant_math.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/quant_math.py)**: Hàm tối ưu hóa Max Sharpe và ước lượng Ledoit-Wolf Covariance. *Mở khi giới thiệu toán cốt lõi.*
8.  **[portfolio_opt.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/portfolio_opt.py)**: Chạy mô phỏng Monte Carlo để sinh tọa độ đám mây đường biên hiệu quả. *Mở khi chứng minh biểu đồ Monte Carlo.*
9.  **[black_litterman.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/black_litterman.py)**: Triển khai toán cập nhật Bayesian Posterior của mô hình Black-Litterman. *Mở khi giải thích tính năng tối ưu hóa nâng cao.*
10. **[backtest_engine.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/backtest_engine.py)**: Mô phỏng tài khoản tái cân bằng có phí giao dịch và độ trượt giá. *Mở khi trình bày Backtest danh mục.*
11. **[ai_advisor.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/ai_advisor.py)**: Kết xuất prompt và stream dữ liệu phản hồi từ mô hình Gemini. *Mở khi giới thiệu về Chatbot AI.*

---

# 3. BẢN ĐỒ DỮ LIỆU CƠ SỞ DỮ LIỆU (DATABASE MAP)

Hệ thống được thiết kế lưu trữ trong Schema `dbo` của SQL Server. Toàn bộ quan hệ được mô tả qua biểu đồ dưới đây:

```
[Users] (1) <------- (N) [Portfolios] (1) <------- (N) [Transactions]
   |                         |                        |
   | (1)                     | (1)                    | (N)
   v                         v                        v
[RefreshTokens] (N)     [PortfolioSnapshots] (N)   [Stocks] (1)
   |
   +-----------------(1) <--- (N) [ChatThreads] (1) <--- (N) [ChatMessages]
   |
   +-----------------(1) <--- (N) [Reports]
   |
   +-----------------(1) <--- (N) [AuditLogs]
```

### Các bảng dữ liệu chính:
1.  **`dbo.Users`**: Lưu thông tin người dùng, mật khẩu băm bcrypt.
2.  **`dbo.Portfolios`**: Lưu danh mục đầu tư. Trường `Type` phân loại danh mục ('optimizer', 'evaluator', 'saved', 'custom').
3.  **`dbo.Transactions`**: Lưu lịch sử giao dịch. Đây là dữ liệu gốc của hệ thống.
4.  **`dbo.PortfolioSnapshots`**: Lưu ảnh chụp tài sản theo ngày để vẽ biểu đồ tăng trưởng.
5.  **`dbo.Stocks`**: Danh mục mã cổ phiếu, được backend tự động khởi tạo khi người dùng nhập một mã mới chưa tồn tại.
6.  **`dbo.ChatThreads` & `dbo.ChatMessages`**: Lưu trữ lịch sử hội thoại của người dùng với trợ lý AI, chia theo từng danh mục.
7.  **`dbo.Reports`**: Lưu vết các báo cáo định lượng đã xuất.
8.  **`dbo.AuditLogs`**: Lưu vết lịch sử thao tác của người dùng trên hệ thống để phục vụ giám sát bảo mật.

---

# 4. ÁNH XẠ CÔNG THỨC TOÁN HỌC VÀO SOURCE CODE

### 4.1. Tỷ suất sinh lợi Logarit (Log Returns)
*   **Công thức**:
    $$r_t = \ln\left(\frac{P_t}{P_{t-1}}\right)$$
*   **Vị trí code**: [data_engine.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/data_engine.py) dòng 102:
    `portfolio_returns = np.log(portfolio_prices / portfolio_prices.shift(1))`

### 4.2. Hiệu chỉnh lực cản biến động (Variance Drag Adjustment)
*   **Công thức**:
    $$R_{\text{expected}} = R_{\text{mean}} - \frac{\sigma^2}{2}$$
*   **Vị trí code**: [quant_math.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/quant_math.py) dòng 17-22:
    ```python
    def adjust_variance_drag(mean_returns, cov_matrix):
        variances = np.diag(cov_matrix)
        return mean_returns - (variances / 2)
    ```

### 4.3. Mô phỏng danh mục Monte Carlo
*   **Công thức**:
    $$R_p = \sum_{i=1}^N w_i R_i, \quad \sigma_p = \sqrt{w^T \Sigma w}, \quad \text{Sharpe} = \frac{R_p - R_f}{\sigma_p}$$
*   **Vị trí code**: [portfolio_opt.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/core/portfolio_opt.py) dòng 33-37:
    ```python
    port_return = np.sum(expected_returns * weights)
    port_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
    port_volatility = np.sqrt(port_variance)
    sharpe = (port_return - 0.03) / port_volatility
    ```

### 4.4. Tối ưu hóa lồi tìm Max Sharpe
*   **Công thức**:
    $$\min_{w} - \left( \frac{w^T R - R_f}{\sqrt{w^T \Sigma w}} \right) \quad \text{subject to} \quad \sum w_i = 1, \quad w_{\text{min}} \le w_i \le w_{\text{max}}$$
*   **Vị trí code**: [quant_math.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/core/quant_math.py) dòng 24-50 trong hàm `solve_max_sharpe`.

### 4.5. Mô hình cập nhật Black-Litterman (Posterior Returns)
*   **Công thức**:
    $$\mu_{BL} = \left[ (\tau \Sigma)^{-1} + P^T \Omega^{-1} P \right]^{-1} \left[ (\tau \Sigma)^{-1} \pi + P^T \Omega^{-1} Q \right]$$
*   **Vị trí code**: [black_litterman.py](file:///c:/Users/Admin/OneDrive/Documents/CSDL/DNT_Workspace_fefix/quant-engine/nvt_quant_lab/backend/app/services/black_litterman.py) dòng 118-119:
    ```python
    middle = np.linalg.inv(inv_tau_sigma + p.T @ inv_omega @ p)
    posterior_mean = middle @ (inv_tau_sigma @ pi + p.T @ inv_omega @ q)
    ```

---

# 5. 30 CÂU HỎI PHẢN BIỆN VÀ TRẢ LỜI CHO GIẢNG VIÊN

#### Q1: Bản chất của hệ thống này giải quyết vấn đề gì thực tế?
**A**: Hệ thống giải quyết bài toán phân bổ vốn khoa học và quản lý rủi ro cho nhà đầu tư cá nhân trên thị trường chứng khoán Việt Nam. Giúp họ tránh phân bổ cảm tính bằng cách áp dụng mô hình toán học (Markowitz và Black-Litterman) để tối ưu tỷ số Sharpe dựa trên dữ liệu lịch sử và ước tính rủi ro thị trường.

#### Q2: Hệ thống có kết nối đặt lệnh chứng khoán thật không?
**A**: Không. Hệ thống là công cụ mô phỏng định lượng và phân tích rủi ro, không tích hợp cổng giao dịch thật với các công ty chứng khoán để tránh các rủi ro pháp lý và kỹ thuật bảo mật giao dịch tiền tệ.

#### Q3: Tại sao lại dùng cơ sở dữ liệu để lưu Transactions thay vì lưu thẳng số dư Holdings?
**A**: Trong thiết kế hệ thống tài chính chuẩn, Giao dịch (Transaction) là **nguồn sự thật duy nhất** (Source of Truth). Holdings (Số dư hiện tại) là dữ liệu thứ cấp được tổng hợp bằng cách cộng dồn các giao dịch theo thời gian. Nếu lưu thẳng Holdings, khi xảy ra lỗi đồng bộ hoặc cần tra cứu lịch sử mua bán ở một thời điểm trong quá khứ, hệ thống sẽ không có cơ sở để đối chiếu và tái cấu trúc dữ liệu.

#### Q4: Thuật toán tính giá vốn bình quân (Average Cost Basis) hoạt động như thế nào trong code?
**A**: Khi có lệnh BUY, hệ thống cộng thêm khối lượng và tăng giá trị vốn gốc. Khi có lệnh SELL, khối lượng giảm đi và tổng vốn gốc giảm tỷ lệ tương ứng theo giá vốn trung bình trước thời điểm bán, giữ nguyên giá vốn bình quân (không thay đổi khi bán, chỉ thay đổi khi mua).

#### Q5: Dữ liệu giá cổ phiếu lịch sử lấy từ đâu và có được cập nhật thời gian thực không?
**A**: Dữ liệu lịch sử (EOD) và dữ liệu thời gian thực (EOD fallback / 1-minute resolution) được lấy từ API Entrade (thuộc nền tảng chứng khoán DNSE). Hệ thống có cơ chế kiểm tra giá realtime liên tục, nếu ngoài giờ giao dịch sẽ tự động fallback về giá đóng cửa của phiên gần nhất.

#### Q6: Tại sao lại sử dụng thư viện `requests_cache` và lưu trữ ở SQLite cục bộ?
**A**: Việc chạy mô phỏng Monte Carlo hoặc Black-Litterman đòi hỏi tải dữ liệu lịch sử của nhiều mã cổ phiếu liên tục. Việc gọi API ngoài lặp đi lặp lại sẽ làm chậm hệ thống và dễ bị nhà cung cấp dịch vụ khóa IP (Rate Limit). Thư viện `requests_cache` giải quyết việc này bằng cách lưu kết quả nến trong 24 giờ vào một file SQLite cục bộ.

#### Q7: Sự khác biệt giữa tỷ suất sinh lợi đơn (Simple Return) và tỷ suất sinh lợi Log (Log Return)?
**A**: Tỷ suất sinh lợi đơn dễ tính toán nhưng không có tính cộng gộp theo thời gian (tổng sinh lời 2 ngày không bằng tổng tỷ suất 2 ngày riêng lẻ). Lợi suất Logarit ($r_t = \ln(P_t/P_{t-1})$) giải quyết được điều này nhờ tính cộng tuyến tính: $r_{0 \to 2} = r_1 + r_2$, đồng thời giúp chuỗi dữ liệu ổn định hơn về mặt phân phối thống kê.

#### Q8: Lực cản biến động (Variance Drag) là gì và tại sao cần hiệu chỉnh?
**A**: Lực cản biến động là hiện tượng độ biến động lớn làm giảm lợi nhuận thực tế hình học của tài sản so với lợi nhuận trung bình số học. Công thức hiệu chỉnh $R_{expected} = R_{mean} - \frac{\sigma^2}{2}$ giúp hạ thấp kỳ vọng lợi nhuận của những mã cổ phiếu quá biến động (như penny) để mô hình không chọn nhầm chúng làm tài sản tối ưu.

#### Q9: Tại sao Ledoit-Wolf Covariance lại tốt hơn ma trận hiệp phương sai mẫu (Sample Covariance)?
**A**: Trong các mẫu dữ liệu nhỏ hoặc có nhiều biến động bất thường (noise), ma trận hiệp phương sai mẫu thường đánh giá sai lệch rủi ro cực đoan. Phương pháp Ledoit-Wolf thực hiện "shrinkage" (co rút), kéo các hệ số hiệp phương sai hướng về ma trận cấu trúc trung tâm ổn định hơn, từ đó cải thiện tính khả thi của nghiệm tối ưu Markowitz.

#### Q10: Mô tả thuật toán tối ưu SLSQP được sử dụng trong hệ thống?
**A**: SLSQP (Sequential Least Squares Programming) là thuật toán tối ưu hóa có ràng buộc. Nó được sử dụng để tối thiểu hóa hàm mục tiêu phi tuyến (ở đây là âm Sharpe Ratio) dưới các ràng buộc tuyến tính như tổng trọng số bằng 1 và các giới hạn cận dưới/cận trên của tỷ trọng từng tài sản.

#### Q11: Ràng buộc "Long-Only" trong tối ưu hóa danh mục nghĩa là gì?
**A**: Nghĩa là tỷ trọng của mỗi cổ phiếu trong danh mục phải không âm ($w_i \ge 0$), người dùng không được phép bán khống (short selling) hoặc vay ký quỹ (margin) để đầu tư vượt quá 100% số vốn thực tế của họ.

#### Q12: Điểm khác biệt giữa hai backtest engine trong hệ thống?
**A**: Hệ thống có hai engine:
1.  **Backtest chiến lược SMA Crossover** (trong `backtester.py` chạy qua framework Backtrader): Mô phỏng việc mua bán tự động dựa trên tín hiệu kỹ thuật (SMA20 cắt SMA50) của danh mục.
2.  **Backtest tái cân bằng danh mục** (trong `backtest_engine.py` viết bằng Pandas thuần): Giữ nguyên danh mục tối ưu và định kỳ điều chỉnh tỷ trọng (hàng tháng/quý) về mức tối ưu ban đầu để kiểm tra hiệu năng giữ danh mục dài hạn.

#### Q13: Phí giao dịch và độ trượt giá (Slippage) được tính toán thế nào trong backtest?
**A**: Phí giao dịch được tính theo tỷ lệ phần trăm cố định trên giá trị giao dịch (ví dụ 0.15% hay 15 bps). Slippage (độ trượt giá do thiếu thanh khoản) được tính cộng thêm vào chi phí mua hoặc trừ bớt từ tiền thu về khi bán (ví dụ 10 bps), mô phỏng sát thực tế ma sát thị trường.

#### Q14: Value at Risk (VaR 95%) là gì và được tính thế nào trong code?
**A**: VaR 95% là mức tổn thất tối đa của danh mục đầu tư trong một khoảng thời gian xác định ở mức độ tin cậy 95%. Hệ thống tính toán bằng phương pháp Parametric VaR: $VaR_{95\%} = R_p - (1.645 \times \sigma_p)$, thể hiện số tiền lớn nhất danh mục có thể mất đi trong điều kiện thị trường bình thường.

#### Q15: Stress Test hoạt động như thế nào?
**A**: Hệ thống tính toán hệ số Beta ($\beta$) tổng thể của danh mục so với Benchmark. Khi thị trường giả định xảy ra cú sốc sập mạng (ví dụ VN30 giảm 5%), tổn thất danh mục được tính tuyến tính đơn giản bằng: $\Delta Portfolio = \beta \times (-5\%)$.

#### Q16: Thuyết Black-Litterman giải quyết nhược điểm gì của mô hình Markowitz?
**A**: Mô hình Markowitz nguyên bản rất nhạy cảm với lợi suất kỳ vọng lịch sử và thường đưa ra tỷ trọng cực đoan (ví dụ dồn 90% vốn vào 1 mã). Black-Litterman giải quyết bằng cách lấy lợi suất cân bằng thị trường làm gốc, và cho phép nhà đầu tư chèn thêm quan điểm (Views) với độ tin cậy cụ thể để điều chỉnh lợi suất kỳ vọng hợp lý hơn.

#### Q17: Các tham số P, Q, Omega trong mô hình Black-Litterman đại diện cho cái gì?
**A**: 
*   **P (Pick Matrix)**: Xác định mã cổ phiếu nào liên quan đến quan điểm (ví dụ: FPT tăng điểm là Absolute view, FPT vượt trội hơn HPG là Relative view).
*   **Q (Views vector)**: Kỳ vọng sinh lời bằng số của quan điểm đó.
*   **$\Omega$ (Omega Matrix)**: Ma trận hiệp phương sai thể hiện độ không chắc chắn của từng quan điểm dựa trên độ tin cậy (confidence) người dùng nhập.

#### Q18: Tham số $\tau$ (tau) trong Black-Litterman có ý nghĩa gì?
**A**: $\tau$ là hệ số tỷ lệ thể hiện độ không chắc chắn của lợi suất cân bằng thị trường (Prior). Trong code hệ thống, $\tau$ mặc định được đặt ở mức $0.05$ theo đúng nghiên cứu thực nghiệm của Black và Litterman.

#### Q19: Làm sao tính toán ma trận $\Omega$ (Omega) từ độ tin cậy (Confidence) của người dùng?
**A**: Hệ thống tính toán tự động bằng cách lấy phương sai của quan điểm làm gốc và nhân với tỷ lệ nghịch đảo của độ tự tin:
$$\Omega_i = (p_i^T (\tau \Sigma) p_i) \times \frac{1 - \text{Confidence}}{\text{Confidence}}$$
Nếu độ tin cậy tiến gần bằng 1 ($100\%$), $\Omega_i$ tiến về 0, nghĩa là quan điểm hoàn toàn chính xác.

#### Q20: Sau khi có lợi suất và ma trận hiệp phương sai mới từ Black-Litterman, hệ thống làm gì tiếp theo?
**A**: Hệ thống đưa lợi suất Posterior Mean và ma trận hiệp phương sai Posterior Covariance mới đó vào bộ tối ưu hóa SLSQP Markowitz để tính toán ra bảng tỷ trọng phân bổ vốn mới.

#### Q21: Hệ thống bảo mật các route API như thế nào?
**A**: Hệ thống sử dụng cơ chế bảo mật OAuth2 với Access Token dạng JWT và Refresh Token. Các route API nhạy cảm yêu cầu kiểm tra quyền sở hữu bằng cách so sánh `user_id` của Token được giải mã với `user_id` sở hữu danh mục trong database.

#### Q22: Khi Access Token hết hạn (sau 30 phút), người dùng có bị logout không?
**A**: Không. Frontend sử dụng lớp `Auth.js` để tự động gửi Refresh Token lên endpoint `/api/auth/refresh` để xin Access Token mới mà không làm gián đoạn trải nghiệm của người dùng.

#### Q23: Audit Log dùng để làm gì và lưu những gì?
**A**: Audit Log ghi lại mọi hoạt động chỉnh sửa dữ liệu quan trọng như: `PORTFOLIO_CREATED`, `TRANSACTION_ADDED`, `TRANSACTION_DELETED`. Nó lưu vết thời gian, ID người dùng thực hiện và chi tiết thay đổi để phục vụ mục đích giám sát hoạt động của hệ thống.

#### Q24: Trợ lý AI có tự tính toán các chỉ số định lượng như Sharpe, Beta không?
**A**: Không. AI không có khả năng tính toán toán học chính xác và dễ bị hiện tượng ảo giác (hallucination). Hệ thống giải quyết bằng cách dùng Python tính toán chính xác toàn bộ số liệu trước, sau đó đóng gói số liệu chuẩn này gửi kèm vào Prompt để AI đóng vai trò diễn giải ngữ nghĩa.

#### Q25: Prompt gửi lên Gemini AI được thiết kế như thế nào để tránh AI tự bịa số liệu?
**A**: Prompt được chèn chỉ thị nghiêm ngặt (Grounding instructions): *"Ground every claim, number, return, volatility, Sharpe ratio, and drawdown figure directly in the provided JSON data. DO NOT make up, invent, or extrapolate any numbers."*

#### Q26: Cơ chế nào đảm bảo hệ thống vẫn hoạt động khi Gemini AI bị lỗi hoặc hết hạn Key?
**A**: Backend có hàm `generate_template_research` đóng vai trò Fallback. Khi không kết nối được tới Gemini, hệ thống tự động sinh báo cáo chuẩn dựa trên các đoạn văn bản template tài chính định sẵn điền các số liệu thật từ Python, đảm bảo người dùng vẫn nhận được kết quả.

#### Q27: Làm thế nào hệ thống xuất báo cáo định lượng ra file Word?
**A**: Hệ thống sử dụng thư viện `python-docx` để tạo cấu trúc tài liệu Word tự động từ dữ liệu JSON của báo cáo, định dạng font chữ Arial chuẩn học thuật, tạo bảng phân bổ và stream dữ liệu nhị phân về trình duyệt người dùng để tải xuống trực tiếp.

#### Q28: Benchmark mặc định của hệ thống là chỉ số nào?
**A**: Mặc định là VN30 (được fetch dữ liệu từ sàn Entrade). Nếu dữ liệu VN30 lỗi, hệ thống tự động tìm chỉ số thay thế là VNINDEX để chạy chế độ so sánh.

#### Q29: Làm sao để kiểm tra tình trạng kết nối của các dịch vụ bên ngoài?
**A**: Trang giám sát hệ thống (/ops) sẽ gọi endpoint `/api/health/dependencies` để kiểm tra độ trễ ping tới SQL Server, kiểm tra cache và tình trạng kết nối mạng tới API Entrade và Gemini AI.

#### Q30: Hạn chế lớn nhất của mô hình tối ưu hóa danh mục hiện tại là gì?
**A**: Mô hình hoàn toàn dựa trên dữ liệu lịch sử quá khứ để ước lượng tương lai. Nếu thị trường xảy ra biến cố vĩ mô chưa từng có tiền lệ (Black Swan events), các tham số tối ưu hóa lịch sử sẽ không còn phản ánh đúng rủi ro thực tế.

---

# 6. BẢN ĐỒ TRẠNG THÁI VÀ HẠN CHẾ CỦA HỆ THỐNG

Dưới đây là bảng phân loại trạng thái thực tế của các tính năng để bạn trả lời chính xác khi giảng viên hỏi sâu:

| Tính năng / Hạng mục | Trạng thái thực tế | Bằng chứng trong code | Hướng trình bày với giảng viên |
| :--- | :--- | :--- | :--- |
| **Quản lý danh mục & holdings** | **Hoàn thiện 100%** | Bảng `dbo.Transactions` và hàm `get_portfolio_holdings` trong `portfolio_service.py` | Trình bày đây là hạt nhân lưu trữ nghiệp vụ của ứng dụng, tổng hợp số dư dựa trên lịch sử giao dịch gốc. |
| **Mô phỏng Monte Carlo & Tối ưu Markowitz** | **Hoàn thiện 100%** | File `portfolio_opt.py` và `quant_math.py` sử dụng thư viện `scipy.optimize` | Trình bày bộ tối ưu toán học chạy trực tiếp trên backend Python, sử dụng SLSQP để giải quyết bài toán lồi. |
| **Tối ưu Black-Litterman** | **Hoàn thiện 100%** | File `black_litterman.py` và `optimization_service.py` | Giải thích mô hình toán học tích hợp quan điểm vĩ mô Bayesian, khắc phục điểm yếu phân bổ cực đoan của Markowitz. |
| **Backtest chiến lược SMA** | **Hoàn thiện 100%** | File `backtester.py` sử dụng framework `backtrader` | Trình bày đây là kiểm thử kỹ thuật giao cắt SMA20/50 có phí ma sát 0.1% và trượt giá 0.05%. |
| **Backtest tái cân bằng danh mục** | **Hoàn thiện 100%** | File `backtest_engine.py` | Trình bày đây là backtest chiến lược giữ danh mục dài hạn tái cơ cấu định kỳ hàng tháng/quý/năm. |
| **Phân tích Trợ lý AI** | **Hoàn thiện** | File `ai_advisor.py` kết nối Gemini API | Giải thích AI đóng vai trò làm sạch và diễn giải báo cáo số liệu định lượng, không tự sinh số liệu. |
| **Cơ chế Paywall và Thanh toán** | **Quyên góp tự nguyện (Voluntary Donation)** | File `payment.py` và webhook sepay trong `main.py` | Giải thích hệ thống tích hợp webhook nhận thông tin chuyển khoản ngân hàng thực tế để demo luồng kích hoạt dịch vụ, đã chuyển cấu hình sang quyên góp tự nguyện. |
| **Dữ liệu tài chính doanh nghiệp (Financials)** | **Dữ liệu thật + Mock Fallback** | Hàm `fetch_financials_internal` trong `main.py` | Giải thích hệ thống kéo thông tin P/E, P/B, ROE thật từ TCBS API, nếu kết nối lỗi sẽ tự động sinh dữ liệu mô phỏng ngẫu nhiên hợp lý để demo không bị ngắt quãng. |
| **Lịch sử Snapshot tài sản** | **Hoàn thiện** | File `performance_service.py` và bảng `dbo.PortfolioSnapshots` | Giải thích hệ thống tự động chụp ảnh tài sản khi có giao dịch phát sinh để theo dõi biến động tài sản theo thời gian. |
