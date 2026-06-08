import pandas as pd
from vnstock import Vnstock

def test_vnstock_v4():
    symbol = "FPT"
    start = "2023-01-01"
    end = "2024-01-01"
    v = Vnstock()
    try:
        stock = v.stock(symbol=symbol, source='TCBS')
        df = stock.quote.history(start=start, end=end, interval="1D")
        print(f"VNSTOCK V4 TCBS FPT 2023-2024: {len(df)} rows")
        if not df.empty:
            print(df.head(1))
            print(df.tail(1))
    except Exception as e:
        print(f"VNSTOCK Error: {str(e)}")

if __name__ == "__main__":
    test_vnstock_v4()
