import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from core.data_engine import fetch_stock_data, fetch_index_data, prepare_portfolio_data

@pytest.fixture
def mock_entrade_response():
    """Giả lập phản hồi JSON từ Entrade API."""
    return {
        't': [1711126800, 1711213200, 1711299600], # Timestamps
        'o': [10.0, 10.5, 11.0],
        'h': [10.6, 11.1, 11.5],
        'l': [9.9, 10.4, 10.8],
        'c': [10.5, 11.0, 11.2],
        'v': [1000, 2000, 1500]
    }

@patch('requests.get')
def test_fetch_stock_data(mock_get, mock_entrade_response):
    # Setup mock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_entrade_response
    mock_get.return_value = mock_response
    
    df = fetch_stock_data("TCB", days_back=10)
    
    assert not df.empty
    assert len(df) == 3
    assert 'close' in df.columns
    assert df.iloc[0]['close'] == 10.5

@patch('requests.get')
def test_fetch_index_data(mock_get, mock_entrade_response):
    # Setup mock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_entrade_response
    mock_get.return_value = mock_response
    
    df = fetch_index_data("VN30", days_back=10)
    
    assert not df.empty
    assert len(df) == 3
    assert 'close' in df.columns

@patch('core.data_engine.fetch_stock_data')
@patch('core.data_engine.fetch_index_data')
def test_prepare_portfolio_data(mock_index, mock_stock):
    # Setup stock data mock
    stock_df = pd.DataFrame({
        'close': [10, 11, 12]
    }, index=pd.to_datetime(['2024-03-01', '2024-03-02', '2024-03-03']))
    mock_stock.return_value = stock_df
    
    # Setup index data mock
    index_df = pd.DataFrame({
        'close': [100, 105, 110]
    }, index=pd.to_datetime(['2024-03-01', '2024-03-02', '2024-03-03']))
    mock_index.return_value = index_df
    
    port_ret, mkt_ret = prepare_portfolio_data(["TCB"], days_back=10)
    
    assert not port_ret.empty
    assert not mkt_ret.empty
    assert "TCB" in port_ret.columns
    assert len(port_ret) == 2 # Do pct_change().dropna()
