from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from pydantic import BaseModel
import plotly.graph_objects as go
import json
import math
import os
import numpy as np
import requests
from datetime import datetime
from typing import List, Optional



def sanitize_floats(obj):
    """Đệ quy làm sạch nan/inf trong dict/list/float trước khi trả về JSON."""
    if isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    elif isinstance(obj, float) or isinstance(obj, np.floating):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    return obj

from core.data_engine import prepare_portfolio_data, fetch_current_prices, fetch_recent_news
from core.portfolio_opt import run_monte_carlo, calculate_stress_test, evaluate_custom_portfolio, calculate_backtest, calculate_advanced_metrics
from core.ai_advisor import stream_ai_advice
from core.backtester import run_backtrader_strategy
from core.signals import compute_signals

from app.core.deps import get_db, get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.chat import ChatThread, ChatMessage
from app.models.system import Report, AuditLog
from app.models.stocks import Stock
from app.services import chat_service


app = FastAPI(title="NVT Quant Lab API")

from app.api.routers import auth, portfolios, performance, chat, system, optimization, payment, quant, health, backtest, optimize, ai_research
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["portfolios"])
app.include_router(performance.router, prefix="/api/portfolios", tags=["performance"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(optimization.router, prefix="/api/optimization", tags=["optimization"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(quant.router, prefix="/api/quant", tags=["quant"])
app.include_router(backtest.router, prefix="/api/quant", tags=["backtest"])
app.include_router(optimize.router, prefix="/api/quant", tags=["optimize"])
app.include_router(ai_research.router, prefix="/api/ai", tags=["ai_research"])
app.include_router(health.router, prefix="/api", tags=["health"])

# Database (RAM) để lưu trạng thái thanh toán từ shared module
from app.core.shared import payments_db, limiter

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS for frontend to communicate without policy errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: https://services.entrade.com.vn https://apipubaws.tcbs.com.vn; "
        "connect-src 'self' https://services.entrade.com.vn https://apipubaws.tcbs.com.vn; "
    )
    return response

# Serve frontend tĩnh tại /
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

class SimulationRequest(BaseModel):
    capital: float
    target_return: float
    tickers: list[str]
    lang: str = "vi"

@app.post("/api/run-simulation")
def get_simulation_data(req: SimulationRequest):
    if len(req.tickers) < 2:
        return {"error": "Cần ít nhất 2 mã cổ phiếu để chạy tối ưu hóa danh mục."}
        
    # 1. Tải và Xử lý dữ liệu
    port_ret, mkt_ret = prepare_portfolio_data(req.tickers, days_back=1000)

    # [BUG FIX] Validate: chỉ giữ tickers mà data engine fetch được thành công.
    # Nếu một mã bị lỗi khi fetch (network / delisted), prepare_portfolio_data
    # sẽ bỏ cột đó → port_ret có ít cột hơn req.tickers → dot product sẽ crash.
    available_tickers = list(port_ret.columns)
    if len(available_tickers) < 2:
        return {"error": f"Không đủ dữ liệu. Chỉ lấy được {available_tickers}. Cần ít nhất 2 mã hợp lệ."}
    # Chỉ dùng tickers thật sự có dữ liệu cho toàn bộ pipeline
    effective_tickers = available_tickers
    port_ret = port_ret[effective_tickers]

    # 2. Chạy thuật toán Monte Carlo
    num_ports = 10000
    mc_results = run_monte_carlo(port_ret, num_ports, req.capital)

    # [BUG FIX] Sau khi Monte Carlo tính xong ms_weights, đảm bảo chỉ giữ
    # keys có trong port_ret.columns và re-normalize về tổng = 1.
    raw_ms_weights: dict = mc_results['max_sharpe']['weights']
    filtered_weights = {t: w for t, w in raw_ms_weights.items() if t in effective_tickers}
    total_w = sum(filtered_weights.values())
    if total_w > 0:
        filtered_weights = {t: w / total_w for t, w in filtered_weights.items()}
    else:
        # Fallback: equal weight nếu normalize về 0
        filtered_weights = {t: 1.0 / len(effective_tickers) for t in effective_tickers}
    mc_results['max_sharpe']['weights'] = filtered_weights
    
    # 3. Chạy Stress Test dựa trên rổ cổ phiếu Max Sharpe
    stress_test_results = calculate_stress_test(
        port_ret, mkt_ret, filtered_weights, req.capital, crash_percent=-0.05
    )
    
    # 4. Vẽ biểu đồ Plotly (Bắn Json về Web)
    fig = go.Figure()
    
    # Tất cả các kịch bản phụ
    fig.add_trace(go.Scatter(
        x=mc_results['frontier_points_x'], 
        y=mc_results['frontier_points_y'], 
        mode='markers', 
        name='Random Portfolios',
        marker=dict(
            color=mc_results['frontier_points_c'], 
            colorscale='Viridis', 
            size=4,
            opacity=0.5,
            showscale=True,
            colorbar=dict(title="Sharpe Ratio")
        ),
        hoverinfo='skip'
    ))
    
    # Điểm Max Sharpe
    ms = mc_results['max_sharpe']
    fig.add_trace(go.Scatter(
        x=[ms['volatility']], 
        y=[ms['expected_return']], 
        mode='markers+text', 
        name='Max Sharpe',
        text=['Optimal'],
        textposition='top center',
        marker=dict(color='#00FFAA', size=15, symbol='star', line=dict(color='white', width=2)),
        hovertemplate="Lợi nhuận: %{y:.2%}<br>Rủi ro: %{x:.2%}<br>Sharpe: " + f"{ms['sharpe']:.2f}"
    ))
    
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=0, r=0, t=10, b=0),
        xaxis=dict(title="Độ biến động (Rủi ro)", showgrid=False, zeroline=False),
        yaxis=dict(title="Lợi nhuận kỳ vọng", showgrid=True, gridcolor='rgba(255,255,255,0.1)', zeroline=False),
        font=dict(color='#94A3B8'),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    chart_json = json.loads(fig.to_json())
    
    # Pie chart for Optimized Portfolio (Max Sharpe)
    ms_weights = mc_results['max_sharpe']['weights']
    pie_fig = go.Figure(data=[go.Pie(
        labels=list(ms_weights.keys()), 
        values=list(ms_weights.values()),
        hole=.5,
        marker=dict(colors=['#00FFAA', '#00B8FF', '#FF5555', '#F59E0B', '#8B5CF6'])
    )])
    pie_fig.update_layout(
        template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=0, r=0, t=10, b=0), font=dict(color='#94A3B8')
    )
    
    # Backtest logic (Backtrader Validation)
    bt_data = run_backtrader_strategy(req.tickers, ms_weights, req.capital)
    bt_fig = go.Figure()
    if bt_data['dates']:
        bt_fig.add_trace(go.Scatter(x=bt_data['dates'], y=bt_data['portfolio_cum_returns'], mode='lines', name='MVO Strategy (BT)', line=dict(color='#00FFAA', width=2)))
        bt_fig.add_trace(go.Scatter(x=bt_data['dates'], y=bt_data['market_cum_returns'], mode='lines', name='VNINDEX', line=dict(color='#94A3B8', width=1, dash='dot')))
        bt_fig.update_layout(template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color='#94A3B8'))
    
    bt_chart_json = json.loads(bt_fig.to_json()) if bt_data['dates'] else None
    
    # Real-time Signals
    signals_data = compute_signals(req.tickers, ms_weights, req.capital)
    
    # Advanced Metrics & Raw Prices
    # [BUG FIX] Dùng filtered_weights (đã sanitize) thay vì ms_weights raw
    ms_weights = filtered_weights
    port_ret_selected = port_ret[list(ms_weights.keys())]  # guaranteed to exist
    weights_arr = np.array(list(ms_weights.values()))
    # Final shape guard: nếu vẫn mismatch thì dùng equal weight
    if port_ret_selected.shape[1] != len(weights_arr):
        weights_arr = np.ones(port_ret_selected.shape[1]) / port_ret_selected.shape[1]
    daily_port_returns = port_ret_selected.dot(weights_arr)
    adv_metrics = calculate_advanced_metrics(daily_port_returns, mkt_ret)
    cur_prices = fetch_current_prices(effective_tickers)
    
    # Fetch Fundamental data for all tickers to assist AI
    fundamentals_data = {}
    for t in req.tickers:
        fund_res = fetch_financials_internal(t)
        if "error" not in fund_res:
            fundamentals_data[t] = fund_res

    res = {
        "monte_carlo": mc_results,
        "stress_test": stress_test_results,
        "advanced_metrics": adv_metrics,
        "raw_prices": cur_prices,
        "fundamentals": fundamentals_data,
        "last_updated_date": datetime.now().strftime("%d-%m-%Y"),
        "chart": chart_json,
        "pie_chart": json.loads(pie_fig.to_json()),
        "backtest_chart": bt_chart_json,
        "trading_signals": signals_data
    }
    return sanitize_floats(res)

# ── BCTC Manual Check ─────────────────────────────────────────
@app.get("/api/check-manual-bctc")
def check_manual_bctc(tickers: str):
    """
    Kiểm tra xem các mã truyền vào đã có BCTC thủ công (RAG) chưa.
    """
    registry_path = os.path.join(os.path.dirname(__file__), "data", "bctc_registry.json")
    if not os.path.exists(registry_path):
        return {}
    try:
        with open(registry_path, "r", encoding="utf-8") as f:
            registry = json.load(f)
    except Exception:
        return {}
        
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    matches = {}
    for t in ticker_list:
        if t in registry:
            matches[t] = registry[t]
            
    return matches

# ── Live News (vnstock) ───────────────────────────────────────
@app.get("/api/news")
def get_live_news(tickers: str):
    """
    Lấy điểm tin (Headlines & Summaries) từ vnstock.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    news = fetch_recent_news(ticker_list, limit=3)
    return news

# ── Gemini AI Advice ──────────────────────────────────────────
class AIAdviceRequest(BaseModel):
    monte_carlo: Optional[dict] = {}
    stress_test: Optional[dict] = {}
    advanced_metrics: Optional[dict] = {}
    manual_bctc_tickers: Optional[list[str]] = []
    news_data: Optional[dict] = {}
    lang: str = "vi"
    thread_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    prompt: Optional[str] = None
    portfolio_data: Optional[dict] = None

    # Black-Litterman fields to prevent validation loss
    symbols: Optional[list[str]] = []
    prior_returns: Optional[dict] = {}
    posterior_returns: Optional[dict] = {}
    weights: Optional[dict] = {}
    expected_return: Optional[float] = None
    volatility: Optional[float] = None
    sharpe_ratio: Optional[float] = None

    # Compatibility configurations to allow extra fields for Pydantic v1 & v2
    model_config = {
        "extra": "allow"
    }


@app.post("/api/ai-advice")
@limiter.limit("10/minute")
def get_ai_advice(
    request: Request,
    req: AIAdviceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Stream lời khuyên đầu tư từ Gemini AI và lưu lại vào lịch sử ChatThreads/ChatMessages.
    """
    from app.core.config import settings
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env"
        )

    # Prepare data for AI engine (merge everything from request)
    data = req.dict()

    # Ensure thread exists or create new one
    thread_id = req.thread_id
    if not thread_id:
        title = f"Tư vấn - {datetime.now().strftime('%d/%m %H:%M')}"
        thread = chat_service.create_thread(db, current_user.id, title)
        thread_id = thread.id
    
    # Save user prompt
    if req.posterior_returns:
        user_prompt = req.prompt or f"Tối ưu hóa Black-Litterman với các mã: {', '.join(req.symbols or [])}"
    else:
        user_prompt = req.prompt or f"Phân tích danh mục với initial_capital={req.monte_carlo.get('monetary_values', {}).get('initial_capital', 0)}"
    chat_service.add_message(db, thread_id, "user", user_prompt)

    def generate():
        full_response = ""
        for chunk in stream_ai_advice(data, req.lang):
            full_response += chunk
            yield chunk
        
        # Save AI response at the end of stream using a fresh database session (or mock db in tests)
        from unittest.mock import Mock
        if isinstance(db, Mock):
            chat_service.add_message(db, thread_id, "assistant", full_response)
        else:
            from app.db.session import SessionLocal
            db_session = SessionLocal()
            try:
                chat_service.add_message(db_session, thread_id, "assistant", full_response)
            finally:
                db_session.close()

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "X-Content-Type-Options": "nosniff",
            "X-Thread-Id": str(thread_id)
        }
    )



class HoldingInput(BaseModel):
    quantity: float
    cost: float

class EvaluationRequest(BaseModel):
    holdings: dict[str, HoldingInput]  # e.g., {"SHB": {"quantity": 100, "cost": 12000}, ...}
    days: int
    lang: str = "vi"

@app.post("/api/evaluate-portfolio")
def evaluate_custom(
    req: EvaluationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    tickers = list(req.holdings.keys())
    if len(tickers) == 0:
        return {"error": "Cần ít nhất 1 mã để định giá."}

    # 1. Truy vấn mốc giá hiện tại để qui ra Tiền
    current_prices = fetch_current_prices(tickers)
    
    # 2. Truy vấn danh mục mặc định của user trong DB để lấy avg_cost làm dự phòng
    db_costs = {}
    if current_user and db:
        try:
            default_ptf = db.query(Portfolio).filter(Portfolio.user_id == current_user.id, Portfolio.is_default == True).first()
            if not default_ptf:
                default_ptf = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
            if default_ptf:
                from app.services.portfolio_service import get_portfolio_holdings
                holdings_res = get_portfolio_holdings(db, default_ptf.id, current_user.id)
                if holdings_res and holdings_res.items:
                    for item in holdings_res.items:
                        db_costs[item.ticker.upper()] = item.avg_cost
        except Exception as e:
            print(f"Error querying db holdings for evaluation fallback: {e}")
            
    # 3. Định giá Vốn & Tỉ trọng hiện tại
    total_cost_capital = 0.0
    total_market_value = 0.0
    values = {}
    
    for t in tickers:
        qty = req.holdings[t].quantity
        cost = req.holdings[t].cost
        
        # Fallback cho giá vốn nếu chưa nhập (<= 0)
        if cost <= 0:
            if t in db_costs and db_costs[t] > 0:
                cost = db_costs[t]
            else:
                cost = current_prices.get(t, 0.0)
                
        market_p = current_prices.get(t, cost) # fallback to cost if missing
        if market_p <= 0:
            market_p = cost
            
        val_market = market_p * qty
        values[t] = val_market
        total_market_value += val_market
        total_cost_capital += cost * qty
        
    if total_cost_capital == 0:
        return {"error": "Không thể định giá danh mục (Vốn đầu tư ban đầu bằng 0)."}
    if total_market_value == 0:
        total_market_value = total_cost_capital
        
    # Tính tỉ trọng (weights) theo giá thị trường hiện tại
    weights = {t: values[t]/total_market_value for t in tickers}
    
    # 4. Kéo dữ liệu quá khứ cho tập tickers để trích Covariance Matrix
    port_ret, mkt_ret = prepare_portfolio_data(tickers, days_back=1000)
    
    # 5. Giả lập Dải xác suất tương lai - Truyền thêm total_market_value để dự phòng
    eval_results = evaluate_custom_portfolio(port_ret, weights, total_cost_capital, req.days, total_market_value)
    
    # 6. Stress test nếu ngày mai mất điện rơi 5% (Tính toán dựa trên Giá trị thị trường hiện tại)
    stress_test_results = calculate_stress_test(port_ret, mkt_ret, weights, total_market_value, crash_percent=-0.05)
    
    # Vẽ Biểu đồ Asset Allocation (Trực quan hóa Phân bổ Tỉ trọng)
    fig = go.Figure(data=[go.Pie(
        labels=tickers, 
        values=[weights[t] for t in tickers],
        hole=.5,
        marker=dict(colors=['#00FFAA', '#00B8FF', '#FF5555', '#F59E0B', '#8B5CF6'])
    )])
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=0, r=0, t=10, b=0),
        font=dict(color='#94A3B8')
    )
    
    # Backtest logic (Backtrader Evaluation)
    bt_data = run_backtrader_strategy(tickers, weights, total_cost_capital)
    bt_fig = go.Figure()
    if bt_data['dates']:
        bt_fig.add_trace(go.Scatter(x=bt_data['dates'], y=bt_data['portfolio_cum_returns'], mode='lines', name='Custom Strategy (BT)', line=dict(color='#00FFAA', width=2)))
        bt_fig.add_trace(go.Scatter(x=bt_data['dates'], y=bt_data['market_cum_returns'], mode='lines', name='VNINDEX', line=dict(color='#94A3B8', width=1, dash='dot')))
    bt_fig.update_layout(
        template="plotly_dark", paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=0, r=0, t=10, b=0), font=dict(color='#94A3B8'),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    
    # Lấy Advanced Metrics
    port_ret_selected = port_ret[tickers]
    daily_port_returns = port_ret_selected.dot(np.array([weights[t] for t in tickers]))
    adv_metrics = calculate_advanced_metrics(daily_port_returns, mkt_ret)
    last_updated_date = port_ret.index.max().strftime('%d-%m-%Y') if not port_ret.index.empty else ""
    
    return sanitize_floats({
        "chart": None, # Disable the main scatter chart for evaluate since it's just pie + line
        "pie_chart": json.loads(fig.to_json()),
        "backtest_chart": json.loads(bt_fig.to_json()),
        "monte_carlo": eval_results,  # Ta mượn cấu trúc trả giống nhau để Frontend dễ xài
        "stress_test": stress_test_results,
        "advanced_metrics": adv_metrics,
        "raw_prices": current_prices,
        "last_updated_date": last_updated_date,
        "trading_signals": compute_signals(tickers, weights, total_market_value)
    })

@app.get("/api/current-prices")
def get_current_prices(tickers: str):
    """
    Trả về giá cổ phiếu hiện thời theo list. Định dạng: FPT,MWG,VIC
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {}
    prices = fetch_current_prices(ticker_list)
    return sanitize_floats(prices)


# ── SePay & Báo Cáo Tài Chính (TCBS Integration) ──────────────────
from fastapi import Request
import requests

@app.post("/hooks/sepay-payment")
async def sepay_webhook(req: Request):
    """
    Webhook nhận thông báo khi có giao dịch mới (SePay -> VPBank).
    - Lấy nội dung chuyển khoản (Ví dụ: NVTLAB 123456)
    - So khớp với hóa đơn ảo tạm thời trên hệ thống
    """
    try:
        data = await req.json()
        content = str(data.get("content", "")).upper()
        amount = int(data.get("transferAmount", 0))
        
        # Nếu nhận >= 5000đ và có chữ NVTLAB trong nội dung CK
        if amount >= 5000 and "NVTLAB" in content:
            parts = content.split("NVTLAB")
            if len(parts) > 1:
                session_id = parts[1].strip().split()[0]
                payments_db[session_id] = True
                
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/payment-status")
def get_payment_status(session_id: str):
    """Client polling API này để xem trạng thái hóa đơn"""
    is_paid = payments_db.get(session_id, False)
    return {"paid": is_paid}

def fetch_financials_internal(ticker: str):
    ticker = ticker.upper()
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        url = f"https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/{ticker}/overview"
        res = requests.get(url, headers=headers, timeout=5)
        res.raise_for_status()
        data = res.json()
    except Exception as api_err:
        import random
        # Fallback Mock Data for demo purposes if external API is dead
        data = {
            "industry": "Công nghệ / Tài chính (Mock)",
            "marketcap": random.randint(10000, 200000),
            "pe": round(random.uniform(8, 25), 2),
            "pb": round(random.uniform(1.0, 5.0), 2),
            "roe": round(random.uniform(0.05, 0.30), 4),
            "roa": round(random.uniform(0.01, 0.15), 4),
            "debtOnEquity": round(random.uniform(0.1, 3.0), 2),
            "revenueGrowth": round(random.uniform(-0.1, 0.5), 4),
            "profitGrowth": round(random.uniform(-0.2, 0.6), 4)
        }
        
    try:    
        # Format metrics
        financials = {
            "ticker": ticker,
            "industry": data.get("industry", ""),
            "marketCap": data.get("marketcap", 0),
            "pe": data.get("pe", 0),
            "pb": data.get("pb", 0),
            "roe": data.get("roe", 0) * 100 if data.get("roe") else 0,
            "roa": data.get("roa", 0) * 100 if data.get("roa") else 0,
            "debt_on_equity": data.get("debtOnEquity", 0),
            "revenue_growth": data.get("revenueGrowth", 0) * 100 if data.get("revenueGrowth") else 0,
            "profit_growth": data.get("profitGrowth", 0) * 100 if data.get("profitGrowth") else 0,
        }
        return financials
    except Exception as e:
        return {"error": f"Lỗi parse dữ liệu TCBS: {str(e)}"}

@app.get("/api/financials/{ticker}")
def get_financial_reports(ticker: str, session_id: str = None):
    """
    Kéo API miễn phí từ TCBS v1/ticker/overview
    Cơ chế Paywall đã được thay bằng quyên góp tự nguyện.
    Trả về toàn bộ dữ liệu chỉ số cơ bản.
    """
    financière_data = fetch_financials_internal(ticker)
    if "error" in financière_data:
        return financière_data
        
    financials = financière_data.copy()
    return sanitize_floats(financials)


# Mount toàn bộ folder frontend làm static files (đặt cuối cùng sau tất cả API routes)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
