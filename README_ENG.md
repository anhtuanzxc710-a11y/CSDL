# NVT Workspace - Technical Documentation

## Overview

This repository is structured as a monorepo containing three highly interconnected sub-projects:
1. **NVT Portfolio Website (`/docs`)**: The primary user-facing landing page and virtual assistant.
2. **VN Stocks Quant Analyzer (`/quant-engine/vn_stocks_quant`)**: The data pipeline system and market-wide quantitative risk analyzer.
3. **NVT Quant Lab (`/quant-engine/dnt_quant_lab`)**: The simulation and portfolio optimization laboratory integrated with Artificial Intelligence (Gemini API).

Below is detailed technical documentation regarding the design philosophy and the solutions implemented to solve various engineering challenges within each project.

---

## 1. NVT Portfolio Website

This frontend project serves as the entry point connecting users to the quantitative background projects.

**Core Features:**
- Displays an extended personal profile, portfolio, Curriculum Vitae (CV) download, and visual demonstrations for the Quant ecosystem.
- **AI-Integrated Virtual Assistant:** I deployed a chatbot utilizing the Groq API protocol to invoke the Meta AI (Llama) model. This assistant is designed to directly answer user queries about my background and projects in a natural manner, achieving ultra-low latency responses thanks to Groq's LPU architecture.

---

## 2. VN Stocks Quant Analyzer

This project acts as the foundational database and technical precursor for the NVT Quant Lab. Initially, the business logic was limited to comparing the Log-Return function of 30 stocks in the VN30 basket with the VNINDEX to gauge stock correlation with the broader market. The project has since evolved into an independent, advanced quantitative analysis system covering the entire stock exchange.

**Notable Data Pipeline Solutions:**
- **Automated Data Fetching Pipeline:** To eliminate dependencies and missing data issues associated with third-party libraries (like `yfinance` or `vnstock`), I developed a Custom API Fetcher. This pipeline uses the `requests` library to extract OHLCV data directly from the public charts of the DNSE (Entrade) system in JSON format. This process runs anonymously, free of charge, and has no Request-Key limitations.
- **Server-Side Smart Caching:** To protect the server IP from being blocklisted due to Rate Limits when accommodating high concurrent user traffic, the system implements Streamlit's `@st.cache_data(ttl=86400)` decorator mechanism. Consequently, the massive 3-year historical dataset for over 1,600+ tickers is requested solely once per day. For subsequent queries, the numerical data is read directly from memory (RAM), achieving millisecond-level latency.
- **Spatiotemporal Anomaly Resolution:** In the Quant model, calculating Alpha and Beta requires the exact time alignment (Inner Join) of two data series (individual stock and market index). However, live APIs frequently return minute-level discrepancies due to ATC (At-The-Close) matching variations. I resolved this issue by employing an implicit time normalization technique (`.dt.normalize()`), which smooths the Unix Timestamp series and forces all records to align precisely at `00:00:00`.

---

## 3. NVT Quant Lab

This is the core computational center, built with the objective of providing automated advisory solutions for retail and beginner (F0) investors. The system's workflow involves: calculating quantitative metrics, running stochastic simulations (Backtesting), and feeding the final data into the Gemini API's natural language processing pipeline to generate actionable interpretations.

**Algorithm Audit and Overfitting Restructuring:**
During the initial design phase, relying exclusively on Markowitz's Modern Portfolio Theory (Mean-Variance Optimization) led to severe model overfitting. The optimization function was overly sensitive to historical return series, resulting in unbalanced portfolio allocations that concentrated risk into a few isolated assets.

After conducting an Algorithm Audit, I implemented several auxiliary mathematical solutions to enhance the model's structural fortitude:
- **Weight Bounds Integration:** I introduced hard constraints into the SciPy Optimize function, ensuring each asset must account for a minimum of 5% and cannot exceed a 40% ceiling within the portfolio, thereby strictly enforcing diversification.
- **Ledoit-Wolf Covariance Matrix Synchronization:** I discarded the traditional Sample Covariance technique in favor of the Ledoit-Wolf Shrinkage method (via `scikit-learn`). This mathematical operation mitigates the noise of outliers over the 3-year timeframe, resulting in a more realistic covariance matrix projection.
- **Drawdown Control alongside Expected Returns:** By deeply modifying the Gemini API Prompt Template, the Artificial Intelligence is now forced to act as a Risk Manager. It automatically scans the Max Drawdown parameter and emits an immediate warning signal in its report if the account's potential drawdown exceeds a 20% threshold.
- **Foundations for the Black-Litterman Model:** The source code architecture for calculating Expected Returns according to the CAPM has now been isolated. This clears the path for integrating users' personal Views into the advanced Black-Litterman allocation model in upcoming updates.

---

## 4. Conclusion

This entire source code repository is the culmination of software architecture, data pipeline engineering, and financial computational science. My constant objective is to resolve the complex equations occurring in the backend to deliver seamless, logical structures for the final user at the frontend display layer.

I look forward to your interest and highly value any professional feedback to further improve these projects. Thank you for dedicating your time to review this documentation.
