# Báo Cáo Kỹ Thuật (Technical Changelog): Nâng Cấp Kiến Trúc Định Lượng

## 1. Tổng quan bản cập nhật
Gói cập nhật này giải quyết những điểm yếu cốt lõi trong hệ thống **DNT Quant Lab**, cụ thể là vấn đề overfitting khi thực hiện backtest và sai lệch trong việc áp dụng mô hình toán học sơ cấp (Log Returns & Variance Drag). Những cập nhật chính bao gồm:
*   Chuyển dịch toàn bộ pipeline từ **Simple Returns** sang **Log Returns**.
*   Áp dụng điều chỉnh **lực cản biến động (Variance Drag)** trong Optimizer và Evaluator.
*   Xây dựng kiến trúc **Walk-Forward Validation Backtester**, phân tách chặt chẽ tập Train (In-sample) và Test (Out-of-sample).
*   Khởi tạo **Baseline Model (Equal Weight)** để cung cấp điểm neo so sánh hiệu suất với Mô hình Mean-Variance (MVO).
*   Khởi tạo lớp `BlackLittermanOptimizer` làm nền tảng cho việc kết hợp góc nhìn vĩ mô (Views) của người dùng ở các phiên bản tiếp theo.

## 2. Cơ sở Toán học

### Chuyển đổi sang Log Returns
Thay vì sử dụng phần trăm thay đổi (`pct_change` tương đương *Simple Returns*), hệ thống hiện sử dụng **Log Returns**:
$$R_t = \ln\left(\frac{P_t}{P_{t-1}}\right)$$

**Lý do:**
*   Log Returns có tính **cộng dồn qua thời gian** (thay vì nhân), làm cho việc tính toán Cumulative Return và Annualized Return chính xác và thuận tiện hơn. Hệ thống chỉ cần cộng chuỗi Log Return và lấy `exp(sum) - 1` để ra lợi nhuận tổng.
*   Phù hợp hơn với giả định **phân phối chuẩn (Normal Distribution)**, vốn là một trong những tiên quyết quan trọng của mô hình MPT (Modern Portfolio Theory) khi đánh giá các miền rủi ro qua độ lệch chuẩn.

### Hiệu chỉnh Variance Drag (Lực cản biến động)
Do tính chất hình học của việc sinh lời kép, trung bình số học thuần túy của lợi nhuận kỳ vọng sẽ đánh giá quá cao (overestimate) lợi nhuận thực tế. 
Để MVO tối ưu hóa chính xác, ta phải hiệu chỉnh theo công thức:
$$E(r)_{adj} = \mu - \frac{\sigma^2}{2}$$
*(với $\mu$ và $\sigma$ đã được thường niên hóa).*
Sự điều chỉnh này trừng phạt mạnh hơn những biến số có độ biến động $\sigma$ lớn. Hệ quả là optimizer có khuynh hướng thận trọng hơn và ưu tiên các nhóm cổ phiếu có sự biến động thấp đến trung bình, tránh hiện tượng đổ dồn trọng số vào 1 cổ phiếu rủi ro có historical mean cao bất thường.

## 3. Khắc phục Overfitting (Walk-Forward Validation)

Cách tiếp cận In-Sample backtesting truyền thống (Train và Test trên cùng 1 đoạn dữ liệu) luôn dẫn đến kết quả khả quan một cách phi thực tế, đánh lừa nhà đầu tư. Hệ thống mới được lập trình hàm lượng giá `walk_forward_backtest` hoạt động dựa trên cơ chế cửa sổ cuộn (Rolling window):
*   **Huấn luyện (Train Window):** Sử dụng `252` ngày giao dịch (1 năm) liền kề trong quá khứ để thiết lập Ma trận hiệp phương sai (Ledoit-Wolf Shrinkage) và sinh ra Trọng số Max Sharpe lý tưởng.
*   **Giao dịch (Test Window):** Rổ cổ phiếu với tỷ trọng Max Sharpe trên sẽ chỉ được mua và nắm giữ (hold) để đo lường lợi nhuận thực tế trong `21` ngày giao dịch tiếp theo (1 tháng).
*   Sau 21 ngày, hệ thống cuộn Train Window trượt về phía trước để tiếp tục tái lập tỷ trọng mới.

Kiến trúc này giúp mô hình backtest đối diện với **dữ liệu mà nó chưa từng "nhìn" thấy**. Để minh bạch hơn, biểu đồ Backtest hiện đối chiếu 3 hiệu suất:
*   MVO Max Sharpe (Out-of-sample)
*   Baseline: Equal Weight - Chia tỷ trọng đều làm đối trọng, giảm độ nhạy với dữ liệu rác.
*   Market: VN-Index.

## 4. Hạn chế còn tồn đọng

Dù đã có bước tiến lớn về mặt định lượng, hệ thống hiện vẫn duy trì một số giả định cần được tinh chỉnh ở tương lai:
1.  **Phí giao dịch (Transaction Costs) và Slippage:** Quá trình Walk-forward rebalance lại danh mục sau mỗi 21 ngày, nhưng hệ thống chưa khấu trừ phần trăm phí và thuế giao dịch bị mất. Slippage (trượt giá do không khớp lệnh đúng giá đóng cửa) cũng chưa được giả lập.
2.  **Long-only Constraint:** Ràng buộc tỷ trọng từ 5% đến 40% tuy giảm điểm nghẽn thị trường, nhưng hệ thống hiện chưa hỗ trợ tối ưu phân bổ tài sản phòng vệ phi cổ phiếu (fixed-income giả định) hoặc Short-selling trong thị trường giá xuống.
3.  **Black-Litterman:** Đã có lớp kiến trúc (`BlackLittermanOptimizer`) nhưng chưa vận hành thực tế. Việc kết nối Views (kỳ vọng lạm phát, dòng tiền khối ngoại) qua Pick-matrix $P$ và Q-vector $Q$ cần thêm một giao diện UI Frontend để nhận ý kiến người dùng.
