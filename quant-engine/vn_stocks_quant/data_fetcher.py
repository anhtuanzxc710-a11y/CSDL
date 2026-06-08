import requests
import pandas as pd
import datetime

def fetch_historical_data(ticker, is_index=False, days_back=1000):
    """
    Kéo dữ liệu giá lịch sử ẩn danh từ nguồn Public APIs (DNSE Entrade).
    Không yêu cầu API Key, chống Cache Block.
    """
    to_ts = int(datetime.datetime.now().timestamp())
    from_ts = int((datetime.datetime.now() - datetime.timedelta(days=days_back)).timestamp())
    
    ticker_type = "index" if is_index else "stock"
    
    url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/{ticker_type}?symbol={ticker}&resolution=1D&from={from_ts}&to={to_ts}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 't' not in data or not data['t']:
            return pd.DataFrame()
            
        dates = pd.to_datetime(data['t'], unit='s', utc=True).tz_convert('Asia/Ho_Chi_Minh').tz_localize(None)
        
        df = pd.DataFrame({
            'date': dates,
            'open': data['o'],
            'high': data['h'],
            'low': data['l'],
            'close': data['c']
        })
        
        # Sát nhập toàn bộ giờ giấc trong ngày về chung một mốc 00:00:00 để khớp lệnh JOIN
        df['date'] = df['date'].dt.normalize()
        
        if is_index:
            df.rename(columns={'close': 'market_close'}, inplace=True)
            df = df[['date', 'market_close']]
        else:
            df.rename(columns={'close': 'stock_close'}, inplace=True)
            df = df[['date', 'open', 'high', 'low', 'stock_close']]
            
        # Loại trừ dữ liệu trùng lặp nếu có
        df = df.groupby('date').last().reset_index()
        
        return df
        
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()
