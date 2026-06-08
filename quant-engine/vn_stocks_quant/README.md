# VN30 Quant Analyzer - Behind the Scenes 🚀

Chào mọi người! Đây là một chút chia sẻ rôm rả của em về cách mà ứng dụng này "hút" và xào nấu dữ liệu chứng khoán ngầm ở phía sau nhé. Ban đầu lúc bắt tay vào code cái dashboard định lượng này, em đã gặp khá nhiều bài toán đau đầu về Data Pipeline. Và đây là cách em đã "phá đảo" chúng!

## 1. Tự động hóa 100% - Tạm biệt việc tải file thủ công! 
Thú thật là thời gian đầu, để có dữ liệu biến động OHLCV (Mở/Cao/Thấp/Đóng/Khối lượng) của rổ VN30, ngày nào em cũng phải lóc cóc lên các trang chuyên dữ liệu như Simplize để tải file Excel về máy. Sau đó lại mất công viết code để cắt gọt rồi lưu thành file CSV cho Pandas đọc. Tính em thì lười, làm thủ công hoài thì thật sự quá cồng kềnh.

Sau đó em định đổi sang dùng các thư viện Python tiện lợi (như `yfinance` hay `vnstock`). Nhưng ngặt một nỗi: `yfinance` lấy dữ liệu công ty Việt Nam hay bị lỗi, lúc thì thiếu ngày, lúc thì sai giá; còn `vnstock` v3 lại bắt đầu yêu cầu Token và có cả giới hạn luồng API cho tài khoản miễn phí.

**Cách giải quyết của em:** Em tự build nguyên một **Custom API Fetcher**! 
Bộ fetcher nhỏ gọn này được em viết bằng `requests`, "ẩn danh" gọi thẳng tới cổng đồ thị Public của chứng khoán DNSE (Entrade). Nhờ vậy, ứng dụng lấy được data trực tiếp từ nguồn chuẩn:
- **100% Ẩn danh & Miễn phí:** Không cần lập tài khoản, không phải đính kèm API Key vào code.
- **Tự động cực mạnh:** Code trực tiếp kéo mã JSON lịch sử giá mới nóng hổi nhất. Tự túc là hạnh phúc!

## 2. Lách luật "Block IP" bằng kỹ thuật Smart Caching
Đi cào dữ liệu "chùa" thường có một rủi ro trí mạng: **Rate Limit**. Nếu như App của em ngày đẹp trời có 1.000 user vào truy cập mà mỗi người đều trigger một luồng gọi API đến DNSE, IP Server của em đảm bảo bị đưa vào sổ đen (Blacklist) ngay tắp lự.

Vì thế, em đã phải thiết kế một "Lá chắn RAM" bằng decorator `@st.cache_data(ttl=86400)` siêu việt của bản thân Streamlit. 
**Cách thức hoạt động:** Khi người khách đầu tiên dậy sớm vào trang web Portfolio này, ứng dụng sẽ đi kéo toàn bộ lịch sử 3 năm của từng cổ phiếu về, nhưng chỉ đúng **1 lần duy nhất**! Sau khi chế biến xong thành DataFrame, nó đem giấu nhẹm vào thanh RAM của máy chủ và giữ đó trong suốt 24 giờ. 
Còn 999 người vào sau? Tốc độ tải trang sẽ chỉ tính bằng mili-giây vì lúc này em cho đọc thẳng từ RAM, hoàn toàn không dội thêm request nào lên máy chủ của nhà cung cấp API nữa. App vừa mượt, vừa an toàn!

## 3. Vấn đề "Lệch Múi Giờ" và Thuật toán Chuẩn hóa ngày
Trong ngành phân tích định lượng (Quant), để chạy được mô hình sinh ra 2 chỉ số cực quan trọng là (Beta) và (Alpha), em phải ghép nối (Inner Join) biến động giá của một cổ phiếu và biến động của thị trường chung (VNINDEX) trên cùng một dòng thời gian.

Tuy nhiên thực tế, API thỉnh thoảng trả về mốc thời gian (Unix Timestamp) của VNINDEX lệch với giờ đóng cửa của cổ phiếu (ví dụ lệch nhau 15 phút do những lần khớp lệnh ATC khác nhau). Khi đó Pandas sẽ từ chối Join dữ liệu lại vì coi đó là 2 điểm dữ liệu khác giờ nhau, dẫn tới vỡ đồ thị.

Cái khó ló cái khôn, em áp dụng ngay lệnh `.dt.normalize()` trước khi nạp data vào bộ nhớ. Lệnh này ép tất cả thời gian của mọi luồng API đều quy chung về một mốc `00:00:00` sáng của ngày giao dịch đó, dẹp bỏ mọi sai số thời gian lẻ tẻ trong ngày. Cuối cùng, hai biểu đồ khớp dính liền với nhau mượt mà không trật một nhịp.

---
Hy vọng những dòng tâm sự mỏng trên giúp mọi người hiểu thêm về những gian truân làm **Data Pipeline** ở Back-end so với lớp UI hào nhoáng bên ngoài nha! Cảm ơn anh/chị và mọi người đã dành thời gian đọc hết! Em luồn mong nhận được mọi đóng góp! ✌️
