import pandas as pd
import requests
import requests_cache
import os
import datetime

cache_dir = os.path.join(os.path.dirname(__file__), '..', 'cache_db')
os.makedirs(cache_dir, exist_ok=True)
requests_cache.install_cache(os.path.join(cache_dir, 'dnt_market_cache'), backend='sqlite', expire_after=86400)

def fetch_index_data(symbol: str = 'VNINDEX', days_back: int = 1000) -> pd.DataFrame:
    """Tải dữ liệu lịch sử Index (VNINDEX, VN30) qua endpoint /index."""
    now = datetime.datetime.now()
    # Làm tròn timestamp đến giờ (hoặc ngày) để requests_cache hoạt động, tránh tạo URL mới liên tục mỗi giây
    now_rounded = now.replace(minute=0, second=0, microsecond=0)
    to_ts = int(now_rounded.timestamp())
    from_ts = int((now_rounded - datetime.timedelta(days=days_back)).timestamp())
    url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/index?symbol={symbol}&resolution=1D&from={from_ts}&to={to_ts}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()
        if 't' not in data or not data['t']:
            return pd.DataFrame()
        dates = pd.to_datetime(data['t'], unit='s', utc=True)
        dates = dates.tz_convert('Asia/Ho_Chi_Minh').tz_localize(None).normalize()
        df = pd.DataFrame({'date': dates, 'close': data['c']})
        df = df.groupby('date').last().reset_index()
        df.set_index('date', inplace=True)
        return df
    except Exception as e:
        print(f"Index Fetch Error for {symbol}: {e}")
        return pd.DataFrame()


def fetch_stock_data(ticker: str, days_back: int = 1000) -> pd.DataFrame:
    """Tải dữ liệu OHLCV lịch sử từ API (không cần Key)."""
    now = datetime.datetime.now()
    # Làm tròn timestamp đến giờ để cache hoạt động
    now_rounded = now.replace(minute=0, second=0, microsecond=0)
    to_ts = int(now_rounded.timestamp())
    from_ts = int((now_rounded - datetime.timedelta(days=days_back)).timestamp())
    
    # VN-Index uses 'VNINDEX' in entrade symbols
    symbol = ticker
    
    url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol={symbol}&resolution=1D&from={from_ts}&to={to_ts}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json()
        if 't' not in data or not data['t']:
            return pd.DataFrame()
            
        dates = pd.to_datetime(data['t'], unit='s', utc=True)
        dates = dates.tz_convert('Asia/Ho_Chi_Minh').tz_localize(None).normalize()
        df = pd.DataFrame({
            'date': dates,
            'open': data['o'],
            'high': data['h'],
            'low': data['l'],
            'close': data['c'],
            'volume': data['v']
        })
        if df.empty:
            return pd.DataFrame()
        df = df.groupby('date').last().reset_index()
        df.set_index('date', inplace=True)
        return df
    except Exception as e:
        print(f"Data Fetch Error for {ticker}: {e}")
        return pd.DataFrame()

def prepare_portfolio_data(tickers: list, days_back: int = 1000):
    """
    Tải và tính toán Daily Returns cho toàn bộ Tickers trong danh mục và VNINDEX.
    Trả về (Returns_DF, VNINDEX_Returns_Series)
    """
    price_data = {}
    for t in tickers:
        df = fetch_stock_data(t, days_back)
        if not df.empty and 'close' in df.columns:
            price_data[t] = df['close']
            
    # Lấy thêm VN30 làm Market Benchmark (VNINDEX không hỗ trợ qua stock endpoint)
    vnindex_df = fetch_index_data('VN30', days_back)
    market_returns = pd.Series(dtype=float)
    if not vnindex_df.empty and 'close' in vnindex_df.columns:
        # [BẢN SỬA LỖI] Đồng nhất với Log Returns
        import numpy as np
        market_returns = np.log(vnindex_df['close'] / vnindex_df['close'].shift(1)).dropna()
        
    if not price_data:
        return pd.DataFrame(), pd.Series(dtype=float)

    portfolio_prices = pd.DataFrame(price_data)
    # [BẢN SỬA LỖI] Chuyển đổi sang Log Returns để ổn định ma trận hiệp phương sai
    import numpy as np
    portfolio_returns = np.log(portfolio_prices / portfolio_prices.shift(1))
    
    # [BẢN SỬA LỖI] Lọc nhiễu: Loại bỏ các biến động > 15% (Biên độ tối đa UPCOM là 15%)
    # Dữ liệu Entrade hay bị spike do chia tách hoặc lỗi API
    portfolio_returns = portfolio_returns[(portfolio_returns < 0.15) & (portfolio_returns > -0.15)]
    portfolio_returns = portfolio_returns.dropna()
    
    # Align dates between portfolio and market
    if market_returns.empty:
        return portfolio_returns, pd.Series(0, index=portfolio_returns.index)

    aligned_data = pd.concat([portfolio_returns, market_returns.rename('VNINDEX')], axis=1).dropna()
    
    # Ensure all original tickers are present in the final data
    available_tickers = [t for t in tickers if t in aligned_data.columns]
    if not available_tickers:
        return pd.DataFrame(), pd.Series(dtype=float)

    port_ret = aligned_data[available_tickers]
    mkt_ret = aligned_data['VNINDEX']
    
    return port_ret, mkt_ret

def fetch_current_prices(tickers: list) -> dict:
    """
    Truy vấn Giá hiện tại thời gian thực (real-time, cập nhật theo từng phút) của danh sách mã cổ phiếu.
    Nếu không lấy được giá realtime (ngoài giờ giao dịch hoặc lỗi mạng), tự động fallback về giá đóng cửa phiên gần nhất.
    """
    import requests_cache
    prices = {}
    now = datetime.datetime.now()
    to_ts = int(now.timestamp())
    from_ts = int((now - datetime.timedelta(days=4)).timestamp()) # 4 ngày để đảm bảo có nến kể cả qua cuối tuần
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    for t in tickers:
        t_str = t.upper()
        # 1. Thử lấy giá real-time (resolution = 1 phút, không dùng cache)
        try:
            url_live = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol={t_str}&resolution=1&from={from_ts}&to={to_ts}"
            with requests_cache.disabled():
                res = requests.get(url_live, headers=headers, timeout=5)
                res.raise_for_status()
                data = res.json()
                if 'c' in data and data['c']:
                    prices[t_str] = float(data['c'][-1]) * 1000
                    continue
        except Exception as e:
            print(f"Live Price Fetch Error for {t_str}: {e}")
            
        # 2. Fallback về EOD (giá đóng cửa cuối ngày)
        try:
            df = fetch_stock_data(t_str, days_back=10)
            if not df.empty:
                prices[t_str] = float(df['close'].iloc[-1]) * 1000
        except Exception as e:
            print(f"Fallback Price Fetch Error for {t_str}: {e}")
            
    return prices


def fetch_recent_news(tickers: list, limit: int = 3) -> dict:
    """
    Sử dụng thư viện vnstock3 để kéo tin tức công ty mới nhất.
    Trả về dict: { "FPT": [ {"title": "...", "summary": "...", "publishDate": "..."} ] }
    """
    news_data = {}
    try:
        from vnstock3 import Vnstock
        for t in tickers:
            try:
                stock = Vnstock().stock(symbol=t, source='TCBS')
                df = stock.company.news()
                if df is not None and not df.empty:
                    tops = df.head(limit)
                    t_news = []
                    for _, row in tops.iterrows():
                        t_news.append({
                            "publishDate": str(row.get('publishDate', '')),
                            "title": str(row.get('title', '')),
                            "summary": str(row.get('summary', ''))
                        })
                    news_data[t] = t_news
                else:
                    news_data[t] = []
            except Exception as e:
                print(f"Error fetching news for {t}: {e}")
                news_data[t] = []
    except ImportError:
        print("vnstock3 library is not available.")
    
    return news_data
