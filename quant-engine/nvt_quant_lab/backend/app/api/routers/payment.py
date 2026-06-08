from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.shared import payments_db

router = APIRouter()

class MockPaymentRequest(BaseModel):
    session_id: str

@router.get("/payment-qr")
def get_payment_qr(session_id: str, amount: int = 20000):
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # URL encoded info: 'NVTLAB session_id' -> 'NVTLAB%20session_id'
    qr_url = f"https://img.vietqr.io/image/MB-0000123456789-qr_only.png?amount={amount}&addInfo=NVTLAB%20{session_id}"
    return {
        "qr_url": qr_url,
        "bank_name": "MBBank",
        "account_no": "0000123456789",
        "account_name": "NGUYEN VAN TUAN",
        "amount": amount,
        "content": f"NVTLAB {session_id}"
    }

@router.post("/payment-mock-trigger")
def trigger_mock_payment(payload: MockPaymentRequest):
    session_id = payload.session_id.strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    payments_db[session_id] = True
    return {"success": True, "message": f"Payment mock triggered for session {session_id}"}
