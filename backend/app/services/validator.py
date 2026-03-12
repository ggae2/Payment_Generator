import xmlschema
from pathlib import Path

XSD_DIR = Path(__file__).parent.parent / "schemas_xsd"

# Legacy mapping (kept for backward compat)
SCHEMA_MAP = {
    "pacs008":      "SIC/pacs.008.001.08.ch.02.xsd",
    "pacs008sepa":  "Sepa/EPC115-06_2023_V1.0_pacs.008.001.08_Update.xsd",
    "pacs008_sepa": "Sepa/EPC115-06_2023_V1.0_pacs.008.001.08_Update.xsd",
}

def validate_xml_against_xsd(xml_content: bytes, message_type: str) -> dict:
    fname = SCHEMA_MAP.get(message_type)
    if not fname or not (XSD_DIR / fname).exists():
        return {"valid": False, "error": f"XSD not found for '{message_type}'"}
    return validate_xml_against_xsd_path(xml_content, XSD_DIR / fname)

def validate_xml_against_xsd_path(xml_content: bytes, xsd_path: Path) -> dict:
    if not xsd_path.exists():
        return {"valid": False, "error": f"XSD file not found: {xsd_path}"}
    try:
        xmlschema.XMLSchema(str(xsd_path)).validate(xml_content)
        return {"valid": True}
    except xmlschema.XMLSchemaValidationError as e:
        return {"valid": False, "error": str(e)}
