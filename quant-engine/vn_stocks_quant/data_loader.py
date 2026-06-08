import pandas as pd
import streamlit as st
from data_fetcher import fetch_historical_data

@st.cache_data(ttl=86400)
def load_market():
    """Lấy dữ liệu VNINDEX từ API Public ẩn danh, cache lại 1 ngày (86400 giây)."""
    df = fetch_historical_data("VNINDEX", is_index=True)
    if df is not None and not df.empty:
        df.set_index('date', inplace=True)
        return df
    return None

@st.cache_data(ttl=86400)
def load_stock(ticker):
    """Lấy dữ liệu Mã cổ phiếu từ API Public ẩn danh, cache lại 1 ngày."""
    df = fetch_historical_data(ticker, is_index=False)
    if df is not None and not df.empty:
        df.set_index('date', inplace=True)
        return df
    return None

@st.cache_data(ttl=86400)
def get_aligned_data(ticker):
    """Căn chỉnh thời gian giữa chứng khoán và thị trường để tính toán Quant (Alpha/Beta)."""
    market_df = load_market()
    stock_df = load_stock(ticker)
    
    if stock_df is None or market_df is None or stock_df.empty or market_df.empty:
        return None
        
    market_close_only = market_df[['market_close']]
    
    # Inner join để chỉ giữ lại những ngày cả 2 biểu đồ khớp ngày giao dịch
    aligned_df = market_close_only.join(stock_df, how='inner')
    
    # Bù lấp dữ liệu nếu rỗng cục bộ
    aligned_df = aligned_df.ffill().bfill()
    
    return aligned_df