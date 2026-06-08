# 🚀 VN Stocks Quant Analyzer - Bản Cập Nhật Lớn (V2.0)

Bản cập nhật V2.0 đánh dấu bước chuyển mình mạnh mẽ của ứng dụng từ việc chỉ theo dõi thụ động 30 mã VN30 sang một **hệ thống phân tích rủi ro định lượng bao quát toàn thị trường chứng khoán Việt Nam**.

Dưới đây là chi tiết các tính năng và nghiệp vụ tài chính mới được nâng cấp:

## 1. Mở Rộng Quy Mô Dữ Liệu: Bao Trọn Sàn Chứng Khoán (1,600+ Mã)
- **Từ VN30 đến Toàn Bộ Thị Trường:** Hệ thống giờ đây hỗ trợ nhập và theo dõi dữ liệu của toàn bộ các mã cổ phiếu đang giao dịch trên cả 3 sàn HSX, HNX và UPCoM.
- **Tối Ưu Tốc Độ Khởi Động:** Danh sách hơn 1,600+ mã được thu thập qua API ẩn và đóng gói sẵn dưới dạng tệp tĩnh `all_tickers.json`. Nhờ kỹ thuật này, ứng dụng khởi động ngay lập tức mà không phải chịu bất kỳ độ trễ do gọi mạng (Network Latency) hay rủi ro bị nhà cung cấp dữ liệu chặn IP.
- **Sức Mạnh "Lá Chắn RAM" (Smart Caching) Vẫn Được Duy Trì:** Cơ chế `@st.cache_data(ttl=86400)` tiếp tục gánh vác khối lượng dữ liệu khổng lồ. Ứng dụng chỉ tải lịch sử giao dịch một lần mỗi 24 giờ cho mỗi ticker, bất chấp số lượng user truy cập lớn.

## 2. Kho Vũ Khí 5 Chỉ Số Quản Trị Rủi Ro Chuyên Sâu Hội Nhập
Để cung cấp cái nhìn chân thực như một quỹ Hedge Fund thu nhỏ, rổ chỉ số của App đã được bổ sung 5 "cỗ máy đo lường rủi ro" cực đoan:

*   🛡️ **Sortino Ratio (Tỉ Suất Bảo Vệ Vốn):** Phiên bản sắc bén hơn của Sharpe. Nó nhận diện rằng "biến động tăng giá là tốt, chỉ biến động giảm mới xấu", từ đó chỉ đo lường sai số ở chiều rớt giá (Downside Deviation).
*   ⚖️ **Treynor Ratio:** Đo phần bù lại rủi ro đạt được trên một đơn vị rủi ro hệ thống ($Beta$).
*   🎯 **R-Squared ($R^2$):** Chỉ báo độ tin cậy. Nếu $R^2$ quá nhỏ, tức cổ phiếu đang bay nhảy theo sóng ngành riêng chứ không màng VNINDEX, khi đó hệ số Beta trở nên vô nghĩa.
*   📉 **VaR 95% (Value at Risk - Rủi Ro Tổn Thất Đuôi):** Chỉ báo dũng khí cho dân margin. Nó ước lượng mức độ sập gầm tối đa có thể đánh gục danh mục trong một ngày bình thường (Confidence 95%).
*   🏆 **Calmar Ratio:** Gạch nối giữa Lợi nhuận gộp hàng năm và Sức chịu đựng chu kỳ sụt giảm (Max Drawdown).

## 3. Trí Tuệ Mô Phỏng (AI Insights) Mang Phong Cách Chuyên Gia
Hàm `generate_insights` đã được tái cấu trúc toàn diện. 
Thay vì liệt kê nhận xét dàn trải, Module phân tích giờ đây tự động:
1. **Phân Tích Chéo (Cross-Validation):** Điền hình là kiểm tra mối nối Beta và $R^2$. Nếu Beta cực đoan mà $R^2$ lủng lẳng ở dưới đáy, AI sẽ lập tức thắp **Đèn Cảnh Báo ⚠️**, nhắc nhở người dùng thận trọng với con số rủi ro hệ thống.
2. **Khẩu Vị Đầu Tư Sâu Sát:** AI phân hoạch giữa trường phái đánh bắt cổ tức phòng thủ (Defensive Anchor) và cờ bạc chớp nhoáng dựa vào chỉ báo VaR và Max Drawdown. Cột Insight giờ thực sự giống một "bản tin nội bộ".

## 4. Giao Diện Người Dùng (Clean UI/UX) Pro Hơn
- **The Welcome Screen:** Loại bỏ cảm giác "vứt báo vào mặt" khi người dùng vừa load trang. Ứng dụng giờ vẫy chào bằng một Splash Screen cực "nghệ", lịch sự mời nhà phân tích chọn mã từ menu bên trái. 
- **The "Ninja" Expander:** Giải quyết bài toán bội thực thông tin bằng cách đặt toàn bộ 5 Siêu Chỉ Số Rủi Ro vào khối đóng ngầm (Expander: `🔬 Chỉ số Quản trị Rủi ro Chuyên sâu`). Bảng điều khiển chính (Top Dashboard) vẫn giữ lại nét nguyên sơ, gọn nhẹ của phiên bản gốc thiết kế bởi Nguyen Van Tuan.
- **Đổi Tên Kho Chứa:** Phù hợp với định hướng rộng khắp, toàn bộ dự án đã ngả mình rũ bỏ lớp áo cũ `vn30_quant_app` để chính thức mang cái tên đầy tham vọng: **`vn_stocks_quant`**.

---
*Ghi chú Cập Nhật, Tháng 03, 2026*
