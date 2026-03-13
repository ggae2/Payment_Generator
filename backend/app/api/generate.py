from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.builder_engine import build_message
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class GenerateRequest(BaseModel):
    scheme:      str        # sic | sepa | swift
    msg_type:    str        # pacs.008 | pacs.009 | etc.
    params:      dict
    do_validate: bool = True
    envelope:    bool = False   # wrap in head.001.001.02 BAH

@router.post("")
async def generate(req: GenerateRequest):
    logger.info(f"Generate request: scheme={req.scheme}, msg_type={req.msg_type}, envelope={req.envelope}, params={req.params}")
    try:
        xml = build_message(req.scheme, req.msg_type, req.params, validate=req.do_validate, envelope=req.envelope)
        msg_id_val = req.params.get('msg_id', 'out')
        filename = f"{req.scheme}_{req.msg_type}_{msg_id_val}.xml"
        logger.info(f"Generated file: {filename}")
        return Response(
            content=xml,
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        logger.error(f"ValueError in generate: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schemes")
def list_schemes():
    from app.core.registry import REGISTRY
    return {
        scheme: list(types.keys())
        for scheme, types in REGISTRY.items()
        if types
    }

@router.get("/schema/{scheme}/{msg_type:path}")
def get_schema(scheme: str, msg_type: str):
    from app.core.registry import get_entry
    try:
        entry = get_entry(scheme, msg_type)
        return {"scheme": scheme, "msg_type": msg_type, "fields": entry["fields"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
