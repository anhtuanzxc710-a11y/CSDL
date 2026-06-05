# NVT Workspace - Technical Documentation

## Giới thiệu Tổng quan

Repository này chứa không gian làm việc được tổ chức theo cấu trúc monorepo, bao gồm ba phân hệ dự án chính có tính liên kết chặt chẽ với nhau:
1. **NVT Portfolio Website (`/docs`)**: Giao diện cổng thông tin người dùng (Landing Page) và trợ lý ảo.
2. **VN Stocks Quant Analyzer (`/quant-engine/vn_stocks_quant`)**: Hệ thống xử lý dữ liệu (Data Pipeline) và phân tích rủi ro định lượng thị trường.
3. **NVT Quant Lab (`/quant-engine/dnt_quant_lab`)**: Hệ thống mô phỏng, tối ưu hóa danh mục đầu tư tích hợp Trí tuệ Nhân tạo (Gemini API).

Dưới đây là tài liệu mô tả chi tiết về triết lý thiết kế và quá trình giải quyết các bài toán kỹ thuật bên trong từng dự án.

---

## 1. NVT Portfolio Website

Đây là dự án Frontend đóng vai trò trang chủ kết nối người dùng với các dự án phân tích phía sau.

**Tính năng cốt lõi:**
- Hiển thị thông tin cá nhân mở rộng, Portfolio, tải hồ sơ năng lực (CV) và cung cấp các bản demo trực quan cho hệ sinh thái Quant.
- **Trợ lý ảo tích hợp AI:** Em đã triển khai một hệ thống Chatbot sử dụng giao thức API của Groq nhằm gọi luồng xử lý từ mô hình Meta AI. Trợ lý này được thiết kế để trực tiếp giải đáp mọi truy vấn của người dùng về năng lực và các dự án của cá nhân em một cách tự nhiên, đạt độ trễ phản hồi cực thấp nhờ kiến trúc LPU của Groq.

---

## 2. VN Stocks Quant Analyzer

Dự án này là cơ sở dữ liệu và tiền đề kỹ thuật vững chắc để xây dựng NVT Quant Lab. Ban đầu, kịch bản nghiệp vụ chỉ giới hạn ở việc so sánh hàm số Log-Return của 30 cổ phiếu thuộc rổ VN30 với chỉ số VNINDEX, nhằm đo lường mức độ đồng pha của cổ phiếu so với thị trường chung. Tuy nhiên, dự án hiện tại đã được nâng cấp bóc tách thành hệ thống phân tích định lượng chuyên sâu cho toàn bộ sàn chứng khoán.

**Các giải pháp xử lý Dữ liệu (Data Pipeline) nổi bật:**
- **Tự động hóa luồng trích xuất dữ liệu:** Để loại bỏ sự phụ thuộc và các lỗi thiếu hụt dữ liệu từ các thư viện bên thứ ba (như `yfinance` hay `vnstock`), em đã tự phát triển một Custom API Fetcher. Luồng fetcher này sử dụng thư viện `requests` để trích xuất dữ liệu OHLCV trực tiếp từ biểu đồ Public của hệ thống DNSE (Entrade) dưới dạng JSON. Luồng chạy hoàn toàn ẩn danh, miễn phí và không có giới hạn Request-Key.
- **Thuật toán Smart Caching ở máy chủ:** Để bảo vệ IP của máy chủ khỏi việc bị quy kết vào sổ đen (Blacklist) do Rate Limit khi có lượng lớn người truy cập cùng lúc, hệ thống sử dụng cơ chế Decorator `@st.cache_data(ttl=86400)` của Streamlit. Nhờ đó, dữ liệu giao dịch khổng lồ 3 năm của hơn 1,600+ mã chỉ được truy xuất độc lập đúng 1 lần/ngày. Với các truy vấn tiếp theo, tệp dữ liệu được đọc thẳng từ RAM với độ trễ tính bằng mili-giây.
- **Xử lý dị biệt không gian thời gian:** Trong mô hình Quant, việc tính toán chỉ số Alpha và Beta yêu cầu hai chuỗi dữ liệu (cổ phiếu và thị trường) phải trúng khớp mốc thời gian (Inner Join). Tuy nhiên, API thực tế thường trả về sai lệch phút do khớp lệnh ATC. Bài toán này đã được em giải quyết thông qua kỹ thuật chuẩn hóa thời gian ngầm định `.dt.normalize()`, qua đó làm mịn chuỗi Unix Timestamp và ép thời gian về một mốc `00:00:00` chung cho tất cả các bản ghi.

---

## 3. NVT Quant Lab

Đây là trung tâm tính toán cốt lõi, được xây dựng với mục tiêu cung cấp giải pháp tư vấn tự động cho nhóm nhà đầu tư cá nhân và F0. Quy trình hoạt động của hệ thống bao gồm: tính toán các chỉ số định lượng, chạy mô phỏng ngẫu nhiên (Backtesting), và chuyển giao dữ liệu cuối cùng vào luồng phân tích ngôn ngữ tự nhiên của Gemini API để đưa ra diễn giải quyết định.

**Kiểm toán và tái cấu trúc thuật toán tránh Overfitting:**
Trong giai đoạn thiết kế ban đầu, việc chỉ sử dụng duy nhất Lý thuyết danh mục của Markowitz (Mean-Variance Optimization) đã khiến mô hình bị quá khớp (overfitting) trầm trọng. Hàm tối ưu hóa nhạy cảm cực đoan với chuỗi lợi nhuận lịch sử, dẫn đến các đề xuất danh mục mất cân đối, dồn tỷ trọng rủi ro vào một vài tài sản duy nhất.

Trải qua quá trình kiểm toán thuật toán (Algorithm Audit), em đã áp dụng các giải pháp bổ trợ để tăng cường tính chống chịu rủi ro của mô hình:
- **Áp đặt Ràng buộc Tỷ trọng (Weight Bounds):** Bổ sung giới hạn cứng vào hàm SciPy Optimize, bảo đảm mỗi tài sản tối thiểu phải chiếm 5% và không vượt qua mức trần 40% trong danh mục, bảo chứng việc phân bổ đa dạng.
- **Đồng bộ Ma trận Hiệp phương sai Ledoit-Wolf:** Phế bỏ kỹ thuật Sample Covariance truyền thống để chuyển sang phương pháp Ledoit-Wolf Shrinkage (thông qua `scikit-learn`). Phép toán này giúp giảm thiểu độ nhiễu loạn của các dữ liệu dị biệt trong khung thời gian 3 năm, mang lại ma trận hiệp phương sai sát với thực tế hơn.
- **Kiểm soát sụt giảm song song Kỳ vọng lợi nhuận:** Can thiệp sâu vào Prompt Template của Gemini API. Trí tuệ Nhân tạo hiện nay bị buộc phải đóng vai trò Thẩm định Rủi ro (Risk Manager); tự động quét thông số Max Drawdown và phát ngay tín hiệu cảnh báo trong báo cáo nếu mức sụt giảm tài khoản lớn hơn ngưỡng 20%.
- **Nền móng cho mô hình Black-Litterman:** Cấu trúc mã nguồn tính toán Kỳ vọng Sinh lời (Expected Returns) theo CAPM hiện đã được cô lập. Việc này dọn đường sẵn để tích hợp Views (Nhận định cá nhân) của người dùng vào mô hình phân bổ siêu cấp Black-Litterman trong các bản cập nhật sắp tới.

---

## 4. Lời Kết

Toàn bộ hệ thống mã nguồn này là sự kết hợp của kiến trúc phần mềm, xử lý đường ống dữ liệu, và khoa học tính toán tài chính. Em luôn đặt mục tiêu là giải quyết được những bài toán phức tạp đằng sau (Backend) để làm nổi bật sự mượt mà cấu trúc logic của người dùng ở lớp hiển thị (Frontend). 

Rất mong nhận được sự quan tâm và những ý kiến đóng góp quý báu từ các anh/chị chuyên môn để em có cơ hội cải tiến thêm cho dự án. Trân trọng cảm ơn mọi người đã dành thời gian theo dõi tài liệu này.
