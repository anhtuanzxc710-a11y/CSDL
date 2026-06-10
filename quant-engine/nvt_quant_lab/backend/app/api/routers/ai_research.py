from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import io

from app.core.deps import get_current_active_user
from app.models.user import User
from app.core.research_generator import generate_grounded_research, export_research_to_docx, DISCLAIMER_TEXT
from main import sanitize_floats
from app.core.shared import limiter

router = APIRouter()

class ResearchRequest(BaseModel):
    analysis_type: str
    quant_results: Optional[Dict] = None
    backtest_results: Optional[Dict] = None
    optimizer_results: Optional[Dict] = None
    benchmark: str = "VN30"
    language: str = "vi"

class ExportDocxRequest(BaseModel):
    research: Dict
    language: str = "vi"

@router.post("/research")
@limiter.limit("5/minute")
def create_research(
    request: Request,
    req: ResearchRequest,
    current_user: User = Depends(get_current_active_user)
):
    valid_types = {
        "portfolio_review",
        "backtest_summary",
        "optimizer_interpretation",
        "benchmark_comparison",
        "risk_assessment",
        "investment_memo"
    }

    if req.analysis_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Loại phân tích '{req.analysis_type}' không hợp lệ. Hỗ trợ: {list(valid_types)}"
        )

    try:
        research, warnings = generate_grounded_research(
            analysis_type=req.analysis_type,
            quant=req.quant_results,
            backtest=req.backtest_results,
            optimizer=req.optimizer_results,
            benchmark=req.benchmark,
            language=req.language
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi tạo báo cáo phân tích AI: {str(e)}"
        )

    # Always ensure disclaimer is appended in the research payload
    research["disclaimer"] = DISCLAIMER_TEXT

    res = {
        "success": True,
        "research": research,
        "warnings": warnings
    }

    return sanitize_floats(res)

@router.post("/research/export-docx")
@limiter.limit("5/minute")
def export_docx_report(
    request: Request,
    req: ExportDocxRequest,
    current_user: User = Depends(get_current_active_user)
):
    try:
        docx_bytes = export_research_to_docx(req.research, req.language)
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=investment_research_report.docx"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi xuất file Word: {str(e)}"
        )
