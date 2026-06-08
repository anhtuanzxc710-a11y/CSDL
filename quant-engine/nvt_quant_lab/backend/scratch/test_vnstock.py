import pandas as pd
from vnstock.explorer.vci import Quote

def test_vci():
    symbol = "FPT"
    start = "2023-01-01"
    end = "2024-01-01"
    quote = Quote(symbol=symbol)
    try:
        df = quote.history(start=start, end=end, interval="1D")
        print(f"VCI FPT 2023-2024: {len(df)} rows")
        if not df.empty:
            print(df.head(1))
            print(df.tail(1))
    except Exception as e:
        print(f"VCI Error: {e}")

def test_tcbs():
    from vnstock.explorer.tcbs import Quote
    symbol = "FPT"
    start = "2023-01-01"
    end = "2024-01-01"
    quote = Quote(symbol=symbol)
    try:
        df = quote.history(start=start, end=end, interval="1D")
        print(f"TCBS FPT 2023-2024: {len(df)} rows")
    except Exception as e:
        print(f"TCBS Error: {e}")

if __name__ == "__main__":
    test_vci()
    test_tcbs()
