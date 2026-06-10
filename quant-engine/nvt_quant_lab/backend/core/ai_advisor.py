import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load .env từ thư mục backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


def _get_model():
    """Khởi tạo Gemini model từ API Key trong .env."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.5-flash")


def _format_vnd(value: float) -> str:
    """Định dạng số tiền VNĐ."""
    return f"{value:,.0f}đ"


def build_prompt(data: dict, lang: str = "vi") -> str:
    """
    Xây dựng prompt chuyên nghiệp từ kết quả Monte Carlo + Stress Test.
    Hỗ trợ cả Optimizer (max_sharpe) lẫn Evaluator mode.
    """
    mc = data.get("monte_carlo") or {}
    stress = data.get("stress_test") or {}
    adv = data.get("advanced_metrics") or {}
    fundamentals_data = data.get("fundamentals") or {}
    user_query = data.get("prompt")

    is_optimizer = "max_sharpe" in mc
    is_bl = bool(data.get("posterior_returns"))

    # General conversation query if no portfolio analysis is provided
    if user_query and not is_bl and not is_optimizer and not mc.get("expected_return") and not mc.get("monetary_values"):
        portfolio_info = ""
        portfolio_data = data.get("portfolio_data") or {}
        holdings = portfolio_data.get("holdings", [])
        if holdings:
            holdings_str = ", ".join([f"{h.get('ticker')}: {h.get('quantity')} cp (giá vốn {h.get('avg_cost', h.get('cost', 0)):,.0f}đ)" for h in holdings])
            portfolio_info = f"\n**DANH MỤC HIỆN TẠI CỦA NGƯỜI DÙNG:**\n{holdings_str}\n"

        if lang == "en":
            return f"""You are a professional Quantitative Investment Director and AI Advisor for NVT Quant Lab.
{portfolio_info}
Answer the following user question/request: {user_query}"""
        else:
            return f"""Bạn là một Giám đốc Đầu tư Định lượng chuyên nghiệp và Cố vấn AI của NVT Quant Lab.
{portfolio_info}
Hãy trả lời câu hỏi/yêu cầu sau của người dùng: {user_query}"""

    # --- Format Tin tức gần đây ---
    news_data = data.get("news_data") or {}
    news_section = ""
    if news_data:
        news_lines = []
        for ticker, articles in news_data.items():
            if articles:
                news_lines.append(f"  • {ticker}:")
                for art in articles[:2]:
                    title = art.get("title", "")
                    summary = art.get("summary", "")
                    if title:
                        news_lines.append(f"    - {title} (Tóm tắt: {summary})" if summary else f"    - {title}")
        if news_lines:
            news_header = "\n**RECENT NEWS:**\n" if lang == "en" else "\n**TIN TỨC GẦN ĐÂY:**\n"
            news_section = news_header + "\n".join(news_lines)

    # --- Trích xuất dữ liệu theo từng mode ---
    bl_comparison_vi = ""
    bl_comparison_en = ""
    query_section = ""
    if user_query:
        query_section = f"\n**CÂU HỎI/YÊU CẦU CỦA NGƯỜI DÙNG:**\n{user_query}\n"

    if is_bl:
        # Dữ liệu từ Black-Litterman
        expected_return_pct = (data.get("expected_return") or 0) * 100
        volatility_pct = (data.get("volatility") or 0) * 100
        sharpe = data.get("sharpe_ratio") or 0
        weights = data.get("weights") or {}
        prior_ret = data.get("prior_returns") or {}
        post_ret = data.get("posterior_returns") or {}
        initial_capital = 0 # BL thường dùng tỉ trọng, không nhất thiết dùng vốn
        timeframe_note = "Dựa trên dữ liệu lịch sử và quan điểm cá nhân"
        
        # Tạo bảng so sánh cho BL
        bl_comparison_vi = "\n**SO SÁNH LỢI NHUẬN KỲ VỌNG (Trước vs Sau khi áp dụng View):**\n"
        bl_comparison_en = "\n**EXPECTED RETURN COMPARISON (Prior vs Posterior):**\n"
        for s in data.get("symbols", []):
            p_val = prior_ret.get(s, 0) * 100
            post_val = post_ret.get(s, 0) * 100
            diff = post_val - p_val
            bl_comparison_vi += f"  - {s}: {p_val:.2f}% -> {post_val:.2f}% (Chênh lệch: {diff:+.2f}%)\n"
            bl_comparison_en += f"  - {s}: {p_val:.2f}% -> {post_val:.2f}% (Diff: {diff:+.2f}%)\n"
    elif is_optimizer:
        # Dữ liệu từ Monte Carlo
        ms = mc.get("max_sharpe") or {}
        values = mc.get("monetary_values") or {}
        expected_return_pct = (ms.get("expected_return") or 0) * 100
        volatility_pct = (ms.get("volatility") or 0) * 100
        sharpe = ms.get("sharpe") or 0
        weights: dict = ms.get("weights") or {}
        initial_capital = values.get("initial_capital") or 0
        timeframe_note = "1 năm (252 ngày giao dịch)"
    else:
        # Dữ liệu từ Portfolio Evaluator
        values = mc.get("monetary_values") or {}
        expected_return_pct = (mc.get("expected_return") or 0) * 100
        volatility_pct = (mc.get("volatility") or 0) * 100
        sharpe = None
        weights = {}
        initial_capital = values.get("initial_capital") or 0
        days = mc.get("timeframe_days") or 63
        timeframe_map = {21: "1 tháng", 63: "3 tháng", 126: "6 tháng", 252: "1 năm"}
        timeframe_note = timeframe_map.get(days, f"{days} ngày giao dịch")

    # ... (Các phần Stress Test, VaR, MDD giữ nguyên hoặc sanitize nếu thiếu) ...
    values = mc.get("monetary_values") or {}
    expected_value = values.get("expected_value", 0) if not is_bl else 0
    ci_lower = values.get("ci_lower_value", 0) if not is_bl else 0
    ci_upper = values.get("ci_upper_value", 0) if not is_bl else 0
    var_loss = values.get("var_value_loss", 0) if not is_bl else 0

    # Stress Test
    beta = stress.get("portfolio_beta", 1.0) or 1.0
    stress_loss = stress.get("estimated_loss_vnd", 0) or 0
    crash_pct = abs(stress.get("simulated_market_crash", -0.05) or -0.05) * 100
    
    # Advanced Metrics
    mdd_pct = abs(adv.get("max_drawdown", 0) or 0) * 100
    
    # --- Format phân bổ tỉ trọng ---
    weights_section = ""
    if weights:
        sorted_w = sorted(weights.items(), key=lambda x: -x[1])
        weights_lines = "\n".join(
            f"    • {t}: {w * 100:.1f}%" for t, w in sorted_w
        )
        weights_section = f"\n**PHÂN BỔ TỐI ƯU ĐỀ XUẤT:**\n{weights_lines}"

    # --- Sharpe assessment ---
    sharpe_note = ""
    if sharpe is not None:
        if sharpe > 1.5: sharpe_note = f"{sharpe:.2f} (Xuất sắc)"
        elif sharpe > 1.0: sharpe_note = f"{sharpe:.2f} (Tốt)"
        elif sharpe > 0.5: sharpe_note = f"{sharpe:.2f} (Trung bình)"
        else: sharpe_note = f"{sharpe:.2f} (Kém)"

    # --- Build the prompt string based on language ---
    if lang == "en":
        prompt = f"""You are a professional Quantitative Investment Director.
Analyze the following {'Black-Litterman' if is_bl else 'Monte Carlo'} optimization results for a Vietnamese stock portfolio.
{query_section}
**PORTFOLIO METRICS:**
- Expected Return: {expected_return_pct:.2f}%
- Volatility: {volatility_pct:.2f}%
- Sharpe Ratio: {sharpe_note}
{bl_comparison_en if is_bl else ""}
{weights_section}

{news_section}

Provide investment advice following this structure:
1. View Analysis (Analyze the user's market expectations)
2. Risk & Return Trade-off
3. Rebalancing Suggestions
4. Conclusion
"""
    else:
        prompt = f"""Bạn là một Giám đốc Đầu tư Định lượng chuyên nghiệp.
Hãy phân tích kết quả tối ưu hóa {'Black-Litterman' if is_bl else 'Monte Carlo'} sau đây cho danh mục chứng khoán Việt Nam.

**THÔNG SỐ DANH MỤC:**
- Lợi nhuận kỳ vọng: {expected_return_pct:.2f}%
- Độ biến động (Rủi ro): {volatility_pct:.2f}%
- Chỉ số Sharpe: {sharpe_note}
{bl_comparison_vi if is_bl else ""}
{weights_section}

{news_section}

Hãy đưa ra lời khuyên đầu tư theo cấu trúc:
1. Phân tích Quan điểm (Đánh giá các kỳ vọng thị trường của người dùng)
2. Đánh giá Rủi ro và Lợi nhuận
3. Gợi ý Tái cơ cấu danh mục
4. Kết luận
"""
    return prompt
    return prompt


def stream_ai_advice(data: dict, lang: str = "vi"):
    """
    Generator: Gọi Gemini API và yield từng text chunk về cho FastAPI StreamingResponse.
    """
    model = _get_model()

    if model is None:
        err_msg = (
            "**Gemini API Key haven't been configured.**\n\n" if lang == "en" else
            "**Gemini API Key chưa được cấu hình.**\n\n"
        )
        yield err_msg
        return

    try:
        prompt = build_prompt(data, lang)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"Error in build_prompt: {tb}")
        yield f"\n\n**Lỗi build_prompt:** {str(e)}\n\nTraceback:\n{tb}"
        return

    try:
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n**Lỗi khi gọi Gemini API:** {str(e)}"
