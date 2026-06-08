import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import os
from data_loader import get_aligned_data, load_stock
from metrics import (
    compute_returns, compute_cumulative_returns, compute_beta,
    compute_volatility, compute_max_drawdown, compute_alpha,
    compute_sharpe_ratio, compute_sortino_ratio, compute_treynor_ratio,
    compute_r_squared, compute_var, compute_calmar_ratio
)
from utils import generate_insights
from i18n import TRANSLATIONS

# --- Session State ---
if 'lang_choice' not in st.session_state:
    st.session_state['lang_choice'] = 'EN'

# --- Page Config & Styling ---
st.set_page_config(page_title="VN Stock Quant Analyzer", layout="wide", page_icon="📈")
st.markdown("""
    <style>
    .block-container { padding-top: 2rem; }
    h1, h2, h3 { color: #E0E0E0; }
    div[data-testid="stMetricValue"] { font-size: 1.8rem; }
    </style>
""", unsafe_allow_html=True)
st.markdown("""
    <style>
    [data-testid="stAppViewContainer"] { background: transparent !important; }
    [data-testid="stHeader"] { background: transparent !important; }
    [data-testid="stSidebar"] {
        background: rgba(11, 15, 25, 0.4) !important;
        backdrop-filter: blur(15px) !important;
        border-right: 1px solid rgba(0, 255, 170, 0.2) !important;
    }
    div[data-testid="metric-container"], .stDataFrame {
        background: rgba(30, 41, 59, 0.3) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(0, 255, 170, 0.15) !important;
        border-radius: 12px !important;
        padding: 15px !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 255, 170, 0.2) !important;
        border-color: rgba(0, 255, 170, 0.4) !important;
    }
    </style>
""", unsafe_allow_html=True)

# --- Sidebar UI & Language Toggle ---
lang_selection = st.sidebar.radio("🌎 Language / Ngôn ngữ", ["English (EN)", "Tiếng Việt (VI)"], 
                                  index=0 if st.session_state['lang_choice'] == 'EN' else 1, horizontal=True)
st.session_state['lang_choice'] = 'EN' if "EN" in lang_selection else 'VI'
lang = st.session_state['lang_choice']
t = TRANSLATIONS[lang]

st.sidebar.title(t['sidebar_title'])
st.sidebar.markdown(t['sidebar_dashboard'])

import json
current_dir = os.path.dirname(os.path.abspath(__file__))
ticker_path = os.path.join(current_dir, 'all_tickers.json')
with open(ticker_path, 'r', encoding='utf-8') as f:
    ALL_TICKERS = json.load(f)

if not ALL_TICKERS:
    st.sidebar.error(t['sidebar_no_data'])
    ticker = None
else:
    ticker = st.sidebar.selectbox(t['sidebar_select_ticker'], ALL_TICKERS, index=None, placeholder=t.get('sidebar_placeholder', 'Chọn một mã...'))

st.sidebar.markdown("---")
with st.sidebar.expander(t['sidebar_expander_title']):
    st.write(t['sidebar_benchmark_1'])
    st.write(t['sidebar_benchmark_2'])

st.sidebar.markdown("<br><br><br><br><br>", unsafe_allow_html=True)
st.sidebar.caption(t['sidebar_footer'])

# --- Main Logic ---
if ticker:
    st.markdown(f"""
    <div style="background: linear-gradient(90deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%); 
                padding: 25px; border-radius: 12px; border-left: 5px solid #00FFAA; margin-bottom: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); backdrop-filter: blur(10px);">
        <h1 style="color: #f8fafc; margin: 0; font-size: 2.2rem; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 2.5rem;">📊</span> {t['main_title_1']} 
            <span style="background: -webkit-linear-gradient(45deg, #00FFAA, #00B8FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{ticker}</span>
        </h1>
        <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 1.05rem;">
            {t['main_title_2']}
        </p>
    </div>
""", unsafe_allow_html=True)

    with st.spinner(t['main_loading'].format(ticker=ticker)):
        df = get_aligned_data(ticker)
        stock_raw = load_stock(ticker)  

    if df is not None and stock_raw is not None:
        # 1. Calculations
        df['stock_ret'] = compute_returns(df['stock_close'])
        df['market_ret'] = compute_returns(df['market_close'])
        df.dropna(inplace=True)

        stock_cum_ret = compute_cumulative_returns(df['stock_ret'])
        market_cum_ret = compute_cumulative_returns(df['market_ret'])
        
        total_stock_ret = stock_cum_ret.iloc[-1]
        total_market_ret = market_cum_ret.iloc[-1]
        
        beta = compute_beta(df['stock_ret'], df['market_ret'])
        alpha = compute_alpha(df['stock_ret'], df['market_ret'], beta)
        sharpe = compute_sharpe_ratio(df['stock_ret'])
        stock_vol = compute_volatility(df['stock_ret'])
        market_vol = compute_volatility(df['market_ret'])
        max_dd_stock, dd_series_stock = compute_max_drawdown(df['stock_ret'])
        
        sortino = compute_sortino_ratio(df['stock_ret'])
        treynor = compute_treynor_ratio(df['stock_ret'], beta)
        r_squared = compute_r_squared(df['stock_ret'], df['market_ret'])
        var = compute_var(df['stock_ret'])
        calmar = compute_calmar_ratio(df['stock_ret'], max_dd_stock)

        # --- Top Metric Dashboard ---
        m_col1, m_col2, m_col3, m_col4, m_col5, m_col6 = st.columns(6)
        
        m_col1.metric(t['m_col1_title'], f"{total_stock_ret:.2%}", f"{(total_stock_ret - total_market_ret):+.2%} {t['m_col1_delta']}")
        m_col2.metric(t['m_col2_title'], f"{sharpe:.2f}", t['m_col2_desc'])
        m_col3.metric(t['m_col3_title'], f"{beta:.2f}", t['m_col3_desc'], delta_color="off")
        m_col4.metric(t['m_col4_title'], f"{alpha:.2%}", t['m_col4_desc'])
        m_col5.metric(t['m_col5_title'], f"{stock_vol:.2%}", t['m_col5_desc'].format(market_vol=f"{market_vol:.2%}"), delta_color="inverse")
        m_col6.metric(t['m_col6_title'], f"{max_dd_stock:.2%}", t['m_col6_desc'], delta_color="inverse")

        st.markdown("---")
    
        with st.expander(t['adv_risk_expander_title'], expanded=False):
            c1, c2, c3, c4, c5 = st.columns(5)
            c1.metric(t['m_col7_title'], f"{sortino:.2f}", t['m_col7_desc'])
            c2.metric(t['m_col8_title'], f"{treynor:.2%}", t['m_col8_desc'])
            c3.metric(t['m_col9_title'], f"{r_squared:.2%}", t['m_col9_desc'])
            c4.metric(t['m_col10_title'], f"{var:.2%}", t['m_col10_desc'], delta_color="inverse")
            c5.metric(t['m_col11_title'], f"{calmar:.2f}", t['m_col11_desc'])

        # --- Visualizations ---
        st.subheader(t['visual_subheader'])
        tab1, tab2, tab3, tab4 = st.tabs([t['tab_1'], t['tab_2'], t['tab_3'], t['tab_4']])

        with tab1:
            fig_candle = go.Figure(data=[go.Candlestick(
                x=stock_raw.index, open=stock_raw['open'], high=stock_raw['high'],
                low=stock_raw['low'], close=stock_raw['stock_close'], name=ticker,
                increasing_line_color='#00FFAA', decreasing_line_color='#FF5555'
            )])
            fig_candle.update_layout(template="plotly_dark", xaxis_rangeslider_visible=False, margin=dict(l=0, r=0, t=20, b=0))
            st.plotly_chart(fig_candle, use_container_width=True, config={'displayModeBar': False})

        with tab2:
            fig_cum = go.Figure()
            fig_cum.add_trace(go.Scatter(x=stock_cum_ret.index, y=stock_cum_ret, mode='lines', name=ticker, line=dict(color='#00FFAA')))
            fig_cum.add_trace(go.Scatter(x=market_cum_ret.index, y=market_cum_ret, mode='lines', name="VNINDEX", line=dict(color='#FF5555', dash='dash')))
            fig_cum.update_layout(hovermode="x unified", template="plotly_dark", margin=dict(l=0, r=0, t=20, b=0))
            st.plotly_chart(fig_cum, use_container_width=True, config={'displayModeBar': False})

        with tab3:
            fig_dd = go.Figure()
            fig_dd.add_trace(go.Scatter(x=dd_series_stock.index, y=dd_series_stock, fill='tozeroy', name="Drawdown", fillcolor='rgba(255, 85, 85, 0.3)'))
            fig_dd.update_layout(template="plotly_dark", margin=dict(l=0, r=0, t=20, b=0))
            st.plotly_chart(fig_dd, use_container_width=True, config={'displayModeBar': False})

        with tab4:
            fig_scatter = px.scatter(df, x='market_ret', y='stock_ret', opacity=0.4, trendline="ols", trendline_color_override="#00FFAA")
            fig_scatter.update_layout(template="plotly_dark", margin=dict(l=0, r=0, t=20, b=0))
            st.plotly_chart(fig_scatter, use_container_width=True, config={'displayModeBar': False})

        st.markdown("---")
    
        # --- Raw Data Explorer ---
        st.subheader(t['raw_data_subheader'])
        with st.expander(t['raw_data_expander']):
            st.caption(t['raw_data_caption'])
            display_df = stock_raw.sort_index(ascending=False).copy()
            st.dataframe(display_df.rename(columns={'stock_close': 'Close'}), use_container_width=True, height=250)
            
        # --- Automated Insights ---
        st.subheader(t['insights_subheader'])
        insights = generate_insights(ticker, beta, alpha, sharpe, stock_vol, max_dd_stock, total_stock_ret, total_market_ret, sortino, treynor, r_squared, var, calmar, lang=lang)
        
        for insight in insights:
            st.markdown(f"- {insight}")

    else:
        st.warning("Data alignment failed. No data matched.")
else:
    # --- Welcome Screen ---
    welcome_title = "Kính chào Quý nhà Đầu tư" if lang == 'VI' else "Welcome, Investor"
    welcome_text = "Hệ thống Phân tích Định lượng Cổ phiếu (Quant Analyzer) đã sẵn sàng. Vui lòng chọn một mã cổ phiếu từ danh mục bên trái để bắt đầu đo lường hiệu suất và rủi ro độc lập chuyên sâu." if lang == 'VI' else "The Quantitative Analysis Dashboard is ready. Please select a stock ticker from the sidebar menu to begin evaluating performance and advanced risk profiles."
    st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(0, 255, 170, 0.2); 
                    padding: 40px; border-radius: 12px; text-align: center; margin-top: 50px;">
            <h1 style="color: #00FFAA; margin-bottom: 20px;">{welcome_title}</h1>
            <p style="color: #94A3B8; font-size: 1.2rem;">{welcome_text}</p>
        </div>
    """, unsafe_allow_html=True)