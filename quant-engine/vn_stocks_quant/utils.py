def generate_insights(ticker, beta, alpha, sharpe, stock_vol, max_dd, total_stock_ret, total_market_ret, sortino, treynor, r_squared, var, calmar, lang='VI'):
    """
    Generate automated insights based on quantitative metrics.
    Written in a sophisticated, institutional financial reporting style.
    """
    insights = []
    
    # 1. Systematic Risk (Beta)
    if beta > 1.3:
        beta_desc = "được xếp loại **Rủi ro cao (Aggressive)**. Tài sản này cực kỳ nhạy cảm và sẽ khuếch đại mạnh mẽ các biến động của lịch sử thị trường." if lang == 'VI' else "is classified as **High Beta / Aggressive**. This asset is highly sensitive to market swings and will likely amplify VNINDEX movements significantly."
    elif beta > 0.8:
        beta_desc = "thể hiện biến động **Đồng pha (Market-aligned)**, chạy sát với quỹ đạo của chỉ số chứng khoán thị trường với mức rủi ro hệ thống vừa phải." if lang == 'VI' else "exhibits **Market-aligned** volatility, effectively tracking the broader benchmark's trajectory with moderate systemic exposure."
    elif beta > 0.3:
        beta_desc = "là một tài sản **Phòng thủ (Defensive)**, cho thấy độ nhạy thấp đối với các cú sốc hệ thống và đóng vai trò như một mỏ neo ổn định danh mục." if lang == 'VI' else "is a **Defensive** asset, demonstrating low sensitivity to systemic shocks and acting as a potential stabilizer during market turbulence."
    else:
        beta_desc = "cho thấy chu kỳ **Ngược pha (Inverse)** với thị trường chung, cung cấp lợi ích đa dạng hóa độc đáo." if lang == 'VI' else "shows **Uncorrelated / Inverse** movement relative to the market, providing unique diversification benefits."
    
    insights.append(f"**( Beta):** Với hệ số Beta là {beta:.2f}, {ticker} {beta_desc}" if lang == 'VI' else f"**Systematic Risk (Beta):** With a Beta of {beta:.2f}, {ticker} {beta_desc}")


    # 2. Risk-Reward Efficiency (Sharpe Ratio)
    if sharpe > 1.5:
        sharpe_desc = "thuộc mức **Xuất sắc**. Tài sản cung cấp lợi suất vượt trội so với rủi ro phải gánh chịu." if lang == 'VI' else "is **Excellent**. The asset provides high excess returns relative to the volatility incurred."
    elif sharpe > 1.0:
        sharpe_desc = "đạt mức **Tốt**. Nó duy trì một sự cân bằng lành mạnh giữa định giá tăng trưởng và phơi nhiễm rủi ro." if lang == 'VI' else "is **Strong**. It maintains a healthy balance between capital appreciation and risk exposure."
    elif sharpe > 0:
        sharpe_desc = "vừa đủ **Chấp nhận được**, dù nó có xu hướng rơi vào chu kỳ biến động cao nhưng không mang lại phần thưởng xứng đáng." if lang == 'VI' else "is **Adequate**, though it may be prone to periods of high volatility without proportional compensation in returns."
    else:
        sharpe_desc = "hiển thị **Đáng báo động (Âm)**, cho thấy rủi ro bỏ ra không đủ bù đắp và kém hơn cả lãi suất phi rủi ro." if lang == 'VI' else "is **Suboptimal (Negative)**, indicating that the risk taken does not justify the returns over the risk-free rate."

    insights.append(f"**(Sharpe Ratio):** Tỉ suất Sharpe đạt {sharpe:.2f} {sharpe_desc}" if lang == 'VI' else f"**Risk-Reward Efficiency (Sharpe):** The Sharpe Ratio of {sharpe:.2f} {sharpe_desc}")


    # 3. Jensen's Alpha (The Edge)
    if alpha > 0.05:
        alpha_desc = f"tạo ra một **Alpha lớn (+{alpha:.2%})**. Minh chứng cho chiến lược chọn lọc gắt gao hoặc có yếu tố xúc tác (catalyst) nội tại mạnh mẽ." if lang == 'VI' else f"generated a **significant alpha (+{alpha:.2%})**. This suggests strong security selection or idiosyncratic growth factors."
    elif alpha > 0:
        alpha_desc = f"thu lại **Alpha biên dương (+{alpha:.2%})**, vượt trội nhẹ so với dự kiến của mô hình CAPM." if lang == 'VI' else f"yielded a **marginal positive alpha (+{alpha:.2%})**, slightly outperforming CAPM expectations."
    else:
        alpha_desc = f"phải chịu **Alpha âm ({alpha:.2%})**, không thể bù đắp được rủi ro hệ thống đã nhận lấy khi đem so với thị trường." if lang == 'VI' else f"yielded a **negative alpha ({alpha:.2%})**, failing to compensate for the systematic risk taken compared to the market benchmark."
        
    insights.append(f"**(Alpha):** Chớp thời cơ, {ticker} đã {alpha_desc}" if lang == 'VI' else f"**Alpha Generation:** {ticker} {alpha_desc}")


    # 4. Downside Risk (Max Drawdown)
    if max_dd < -0.4:
        dd_desc = f"lên tới mức **Thảm khốc ({max_dd:.2%})**. Yêu cầu sức chịu đựng thần kinh tột độ vì lịch sử từng bốc hơi tài sản lớn." if lang == 'VI' else f"is **Severe ({max_dd:.2%})**. High-conviction investors only; requires extreme risk tolerance due to historical capital erosion."
    elif max_dd < -0.2:
        dd_desc = f"nằm ở ngưỡng **Trung bình ({max_dd:.2%})**, khá quen thuộc với các đợt rung lắc (correction) của chứng khoán Việt." if lang == 'VI' else f"is **Moderate ({max_dd:.2%})**, which is typical for Vietnamese equity fluctuations during correction phases."
    else:
        dd_desc = f"cực kỳ **Ngoại hạng ({max_dd:.2%})**, cho thấy rào chắn bảo vệ vốn thượng thừa chống lại mọi đợt bán tháo." if lang == 'VI' else f"is **Exceptional ({max_dd:.2%})**, highlighting superior capital preservation and resilience during market downturns."
        
    insights.append(f"**(Max Drawdown):** Cú sụt giảm lịch sử tồi tệ nhất {dd_desc}" if lang == 'VI' else f"**Risk Profile (Max Drawdown):** Historical maximum drawdown {dd_desc}")


    # 5. Advanced Risk / Combination Warning
    if r_squared < 0.4 and beta > 1.0:
        r2_warn = f"⚠️ **Lưu ý:** Khuyến nghị thận trọng với hệ số Beta ({beta:.2f}) do mức độ tương quan R-Squared với VNINDEX quá thấp ({r_squared:.2%}). Cổ phiếu này đang chạy theo động lực riêng lẻ chứ không hẳn đi theo sóng thị trường." if lang == 'VI' else f"⚠️ **Warning:** The high Beta ({beta:.2f}) indicates systemic sensitivity, but the low R-Squared ({r_squared:.2%}) implies this asset is trading largely on individual idiosyncrasies rather than broader market momentum."
        insights.append(r2_warn)
        
    if var < -0.05:
        adv_risk = f"**Khẩu vị rủi ro chuyên sâu:** Tỉ suất bảo vệ vốn (Sortino) đạt {sortino:.2f}. Đặc biệt cảnh báo sụt giảm đuôi (VaR 95% = {var:.2%}/ngày) cực rủi ro, chỉ phù hợp chiến lược lướt sóng nhanh chịu đựng cao." if lang == 'VI' else f"**Advanced Risk Profile:** Capital protection (Sortino) stands at {sortino:.2f}. Extreme tail-risk warning: VaR (95%) highlights severe potential daily drops of {var:.2%}, suited only for aggressive strategies."
    else:
        adv_risk = f"**Khẩu vị rủi ro chuyên sâu:** Tỉ suất bảo vệ vốn (Sortino) là {sortino:.2f} với rủi ro tổn thất trong ngày (VaR 95%) được kiểm soát chặt chẽ quanh mức {var:.2%}." if lang == 'VI' else f"**Advanced Risk Profile:** Defensive ratio (Sortino) is {sortino:.2f}. Daily tail-risk (VaR 95%) remains well-contained around {var:.2%}."
    insights.append(adv_risk)


    # 6. Algorithmic Verdict (Summary)
    if alpha > 0 and sharpe > 1.0 and calmar > 0.5:
        verdict = "**Nhận định Tổng quan:** Cổ phiếu này được chứng nhận chuẩn **'Đầu tư Tăng trưởng Chất lượng'** với hiệu suất bù rủi ro cực tốt." if lang == 'VI' else "**Verdict:** This asset qualifies as a **'Quality Growth'** play with superior risk-adjusted performance."
    elif beta < 0.8 and max_dd > -0.15:
        verdict = "**Nhận định Tổng quan:** Đây chính là **'Mỏ neo Phòng thủ'** hoàn mỹ cho danh mục những thời khắc sóng gió." if lang == 'VI' else "**Verdict:** This asset acts as a **'Defensive Anchor'**, ideal for capital preservation during turbulent markets."
    elif beta > 1.2 and alpha > 0.05:
        verdict = "**Nhận định Tổng quan:** Siêu phẩm **'Alpha Cường độ cao'** cực kỳ phù hợp cho những chiến binh đánh Momentum." if lang == 'VI' else "**Verdict:** This is a **'High-Beta Alpha'** engine, tailored for aggressive momentum hunters."
    else:
        verdict = "**Nhận định Tổng quan:** Biên độ hoạt động **'Phi tiêu chuẩn'**; phân tích chưa xác định rõ xu thế vượt trội so với rủi ro ngầm định." if lang == 'VI' else "**Verdict:** Performance profile is **'Substandard'** relative to generated risk; careful ongoing evaluation is highly advised."
    
    insights.append(verdict)

    return insights