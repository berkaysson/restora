from fastapi import APIRouter, Depends, HTTPException, status
from application.dto.log_dto import ExternalLogDTO
from application.use_cases.ingest_external_log import IngestExternalLogUseCase
from api.dependencies import get_ingest_external_log_use_case

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.post("", status_code=status.HTTP_200_OK)
async def ingest_log(
    payload: ExternalLogDTO,
    use_case: IngestExternalLogUseCase = Depends(get_ingest_external_log_use_case)
):
    """
    Ingests external logs and broadcasts them asynchronously to frontend clients.
    """
    try:
        domain_log = payload.to_domain()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    success = await use_case.execute(domain_log)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to broadcast log message."
        )

    return {"status": "success", "message": "Log broadcasted successfully."}
