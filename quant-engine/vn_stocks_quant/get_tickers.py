import sys
import io
import json

# Ensure we don't hit print encoding errors on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

try:
    from vnstock3 import Vnstock
    stock = Vnstock().stock(symbol='ALL', source='VCI')
    df = stock.listing.all_symbols()
    # Filter only stocks (not derivatives, fx, etc)
    if 'type' in df.columns:
        df = df[df['type'].str.upper() == 'STOCK']
    
    tickers = sorted(df['symbol'].dropna().unique().tolist())
    
    with open('all_tickers.json', 'w', encoding='utf-8') as f:
        json.dump(tickers, f)
    
    print(f"Successfully saved {len(tickers)} tickers to all_tickers.json")

except Exception as e:
    import traceback
    traceback.print_exc()
