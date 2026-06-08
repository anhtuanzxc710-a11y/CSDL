import pandas as pd
import requests
import datetime
import time

class VnStockDataProvider:
    def __init__(self, source: str = "ENTRADE"):
        self.source = source.upper()

    def get_price_history(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: str = "1D",
    ) -> pd.DataFrame:
        """
        Lấy dữ liệu lịch sử từ API Entrade (Ổn định và chính xác theo ngày tháng).
        """
        try:
            # Chuyển đổi YYYY-MM-DD sang Unix Timestamp
            start_ts = int(time.mktime(datetime.datetime.strptime(start_date, "%Y-%m-%d").timetuple()))
            end_ts = int(time.mktime(datetime.datetime.strptime(end_date, "%Y-%m-%d").timetuple()))
            
            # API Entrade dùng cho biểu đồ kỹ thuật
            url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol={symbol}&resolution=1D&from={start_ts}&to={end_ts}"
            
            headers = {'User-Agent': 'Mozilla/5.0'}
            res = requests.get(url, headers=headers, timeout=10)
            res.raise_for_status()
            
            data = res.json()
            if 't' not in data or not data['t']:
                raise ValueError(f"Không có dữ liệu cho mã {symbol}")

            # Chuyển đổi sang DataFrame
            # 't': timestamp, 'c': close
            dates = pd.to_datetime(data['t'], unit='s')
            # Chuyển sang múi giờ VN và bỏ timezone để tránh lỗi merge
            dates = dates.tz_localize('UTC').tz_convert('Asia/Ho_Chi_Minh').tz_localize(None).normalize()
            
            df = pd.DataFrame({
                'date': dates,
                'close': data['c']
            })
            
            # Làm sạch dữ liệu
            df = df.dropna().sort_values('date').drop_duplicates(subset=['date'])
            df['symbol'] = symbol
            return df
            
        except Exception as e:
            raise ValueError(f"Lỗi fetch dữ liệu {symbol} từ Entrade: {str(e)}")

    def get_close_matrix(
        self,
        symbols: list[str],
        start_date: str,
        end_date: str,
        interval: str = "1D",
    ) -> pd.DataFrame:
        merged = None
        for symbol in symbols:
            try:
                df = self.get_price_history(
                    symbol=symbol,
                    start_date=start_date,
                    end_date=end_date,
                    interval=interval,
                )[["date", "close"]].rename(columns={"close": symbol})

                if merged is None:
                    merged = df
                else:
                    merged = merged.merge(df, on="date", how="outer")
            except Exception as e:
                print(f"Warning: Skipping {symbol} due to error: {e}")
                continue

        if merged is None or merged.empty:
            raise ValueError("Không thể tạo ma trận giá từ các mã đã chọn.")

        # Sắp xếp theo ngày, set index và lọc các cột symbols có dữ liệu
        merged = merged.sort_values("date").set_index("date")
        available_symbols = [s for s in symbols if s in merged.columns]
        
        # Fill dữ liệu trống (nếu có) bằng giá trị gần nhất
        merged = merged[available_symbols].ffill().bfill()
        
        return merged