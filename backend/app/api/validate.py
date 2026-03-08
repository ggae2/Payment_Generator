from fastapi import APIRouter, UploadFile
from app.services.validator import validate_xml_against_xsd

router = APIRouter()

@router.post("/{message_type}")
async def validate_file(message_type: str, file: UploadFile):
    content = await file.read()
    return validate_xml_against_xsd(content, message_type)
