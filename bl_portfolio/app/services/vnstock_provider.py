import pandas as pd


class VnStockDataProvider:
    def __init__(self, source: str = "TCBS"):
        self.source = source.upper()

    def _get_quote_obj(self, symbol: str):
        """
        Lấy Quote object trực tiếp từ explorer tương ứng.
        KHÔNG dùng Vnstock().stock() vì cách đó luôn khởi tạo Company
        và gọi VCI API ngay lập tức → KeyError: 'data' khi VCI lỗi.
        """
        if self.source == "TCBS":
            from vnstock.explorer.tcbs import Quote
            return Quote(symbol=symbol)
        elif self.source == "VCI":
            from vnstock.explorer.vci import Quote
            return Quote(symbol=symbol)
        elif self.source == "MSN":
            from vnstock.explorer.msn import Quote
            return Quote(symbol=symbol)
        else:
            # Fallback TCBS nếu source lạ
            from vnstock.explorer.tcbs import Quote
            return Quote(symbol=symbol)

    def _normalize_history(self, df) -> pd.DataFrame:
        if df is None:
            raise ValueError("vnstock trả về None.")

        # Xử lý nếu là dict thay vì DataFrame
        if isinstance(df, dict):
            key = next((k for k in ["data", "records", "rows", "ohlcv"] if k in df), None)
            if key:
                df = pd.DataFrame(df[key])
            else:
                raise ValueError(f"vnstock trả về dict, không rõ key: {list(df.keys())}")

        if not isinstance(df, pd.DataFrame) or df.empty:
            raise ValueError("Không lấy được dữ liệu giá từ vnstock.")

        data = df.copy()
        data.columns = [str(c).strip().lower() for c in data.columns]

        date_candidates  = ["time", "date", "tradingdate", "trading_date"]
        close_candidates = ["close", "adj close", "adj_close", "adjustclose", "priceclose"]

        date_col  = next((c for c in date_candidates  if c in data.columns), None)
        close_col = next((c for c in close_candidates if c in data.columns), None)

        if date_col is None:
            raise ValueError(f"Không tìm thấy cột ngày. Các cột hiện có: {list(data.columns)}")
        if close_col is None:
            raise ValueError(f"Không tìm thấy cột close. Các cột hiện có: {list(data.columns)}")

        data = data[[date_col, close_col]].copy()
        data.columns = ["date", "close"]
        data["date"]  = pd.to_datetime(data["date"])
        data["close"] = pd.to_numeric(data["close"], errors="coerce")
        data = data.dropna(subset=["date", "close"]).sort_values("date")
        data = data.drop_duplicates(subset=["date"])
        return data

    def get_price_history(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
        interval: str = "1D",
    ) -> pd.DataFrame:
        quote = self._get_quote_obj(symbol)
        raw   = quote.history(start=start_date, end=end_date, interval=interval)
        data  = self._normalize_history(raw)
        data["symbol"] = symbol
        return data

    def get_close_matrix(
        self,
        symbols: list[str],
        start_date: str,
        end_date: str,
        interval: str = "1D",
    ) -> pd.DataFrame:
        merged = None
        for symbol in symbols:
            df = self.get_price_history(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                interval=interval,
            )[["date", "close"]].rename(columns={"close": symbol})

            merged = df if merged is None else merged.merge(df, on="date", how="outer")

        if merged is None or merged.empty:
            raise ValueError("Không ghép được ma trận giá.")

        return merged.sort_values("date").set_index("date")[symbols]