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
    mc = data.get("monte_carlo", {})
    stress = data.get("stress_test", {})
    adv = data.get("advanced_metrics", {})
    fundamentals_data = data.get("fundamentals", {})

    # --- Trích xuất dữ liệu theo từng mode ---
    is_optimizer = "max_sharpe" in mc
    is_bl = "posterior_returns" in data  # Black-Litterman check

    if is_bl:
        # Dữ liệu từ Black-Litterman
        expected_return_pct = data.get("expected_return", 0) * 100
        volatility_pct = data.get("volatility", 0) * 100
        sharpe = data.get("sharpe_ratio", 0)
        weights = data.get("weights", {})
        prior_ret = data.get("prior_returns", {})
        post_ret = data.get("posterior_returns", {})
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
        ms = mc["max_sharpe"]
        values = mc["monetary_values"]
        expected_return_pct = ms.get("expected_return", 0) * 100
        volatility_pct = ms.get("volatility", 0) * 100
        sharpe = ms.get("sharpe", 0)
        weights: dict = ms.get("weights", {})
        initial_capital = values.get("initial_capital", 0)
        timeframe_note = "1 năm (252 ngày giao dịch)"
    else:
        # Dữ liệu từ Portfolio Evaluator
        values = mc.get("monetary_values", {})
        expected_return_pct = mc.get("expected_return", 0) * 100
        volatility_pct = mc.get("volatility", 0) * 100
        sharpe = None
        weights = {}
        initial_capital = values.get("initial_capital", 0)
        days = mc.get("timeframe_days", 63)
        timeframe_map = {21: "1 tháng", 63: "3 tháng", 126: "6 tháng", 252: "1 năm"}
        timeframe_note = timeframe_map.get(days, f"{days} ngày giao dịch")

    # ... (Các phần Stress Test, VaR, MDD giữ nguyên hoặc sanitize nếu thiếu) ...
    expected_value = mc.get("monetary_values", {}).get("expected_value", 0) if not is_bl else 0
    ci_lower = mc.get("monetary_values", {}).get("ci_lower_value", 0) if not is_bl else 0
    ci_upper = mc.get("monetary_values", {}).get("ci_upper_value", 0) if not is_bl else 0
    var_loss = mc.get("monetary_values", {}).get("var_value_loss", 0) if not is_bl else 0

    # Stress Test (BL có thể không có stress test mặc định, cần check)
    beta = stress.get("portfolio_beta", 1.0)
    stress_loss = stress.get("estimated_loss_vnd", 0)
    crash_pct = abs(stress.get("simulated_market_crash", -0.05)) * 100
    
    # Advanced Metrics
    mdd_pct = abs(adv.get("max_drawdown", 0)) * 100
    
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

    prompt = build_prompt(data, lang)

    try:
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n**Lỗi khi gọi Gemini API:** {str(e)}"
