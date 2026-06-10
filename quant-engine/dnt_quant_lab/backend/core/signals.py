import pandas as pd
from core.data_engine import fetch_stock_data

def compute_signals(tickers: list, weights: dict, capital: float) -> dict:
    """
    Phân tích Technical Analysis ngắn hạn dựa trên SMA20 vs SMA50.
    Tính toán tín hiệu (Action) và khối lượng (Volume) khuyến nghị dựa trên vị thế Tối ưu.
    """
    signals = {}
    
    for ticker in tickers:
        df = fetch_stock_data(ticker, days_back=100)
        
        target_weight = weights.get(ticker, 0)
        target_allocation = capital * target_weight
        
        if df.empty or len(df) < 50:
            signals[ticker] = {
                "action": "HOLD (Đợi Dữ Liệu)",
                "detail": "Cần thêm dữ liệu lịch sử để xác nhận xu hướng.",
                "price": 0,
                "volume": 0,
                "broker_url": "https://smartoneweb.vps.com.vn/"
            }
            continue
            
        close_series = df['close']
        current_price = float(close_series.iloc[-1]) * 1000 # API data scaled back to VND
        
        sma20 = close_series.rolling(window=20).mean()
        sma50 = close_series.rolling(window=50).mean()
        
        curr_sma20 = sma20.iloc[-1]
        curr_sma50 = sma50.iloc[-1]
        prev_sma20 = sma20.iloc[-2]
        prev_sma50 = sma50.iloc[-2]
        
        action = "HOLD"
        detail = ""
        
        # Crossover logic
        if prev_sma20 <= prev_sma50 and curr_sma20 > curr_sma50:
            action = "BUY (ĐIỂM GIAO CẮT)"
            detail = "SMA20 vừa cắt lên SMA50. Xác nhận tín hiệu mua mạnh, xu hướng tăng bắt đầu."
        elif prev_sma20 >= prev_sma50 and curr_sma20 < curr_sma50:
            action = "SELL (ĐIỂM GIAO CẮT)"
            detail = "SMA20 vừa cắt xuống SMA50. Xác nhận tín hiệu bán khẩn cấp."
        else:
            # Nếu đang trong xu hướng tăng mạnh
            if curr_sma20 > curr_sma50:
                action = "BUY (DUY TRÌ VỊ THẾ MUA)"
                detail = "Đường giá đang ở trong xu hướng tăng ngắn hạn ổn định (SMA20 > SMA50)."
            else:
                action = "SELL (ĐỨNG NGOÀI THỊ TRƯỜNG)"
                detail = "Đường giá đang ở trong xu hướng giảm (SMA20 < SMA50). Cân nhắc hạ tỷ trọng."
                
        # Tính toán khối lượng lô 100
        # Ở VN, giao dịch khớp lệnh lô chẵn 100.
        if current_price > 0:
            raw_volume = target_allocation / current_price
            # Làm tròn xuống lấy lô 100
            volume = int(raw_volume // 100) * 100
        else:
            volume = 0
            
        # Ghi nhận kết quả
        signals[ticker] = {
            "action": action,
            "detail": detail,
            "price": current_price,
            "volume": volume,
            "broker_url": "https://smartoneweb.vps.com.vn/" # Cập nhật link chuẩn của VPS SmartOne
        }
        
    return signals
