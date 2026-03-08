import re
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from pathlib import Path
from datetime import datetime, date
import uuid
import logging
from app.core.registry import get_entry, get_xsd_path, TEMPLATES_DIR
from app.services.validator import validate_xml_against_xsd_path

logger = logging.getLogger(__name__)

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
)

MSG_ID_MAX_LEN = 35  # ISO 20022 / SWIFT max length for MsgId


def _validate_params(entry: dict, params: dict) -> list[str]:
    """Check required fields and patterns against the registry field definitions."""
    errors = []
    for field in entry.get("fields", []):
        name  = field["name"]
        value = params.get(name)
        if field.get("required") and not value and value != 0:
            errors.append(f"Missing required field: '{name}' ({field.get('label', name)})")
            continue
        if value is not None and "pattern" in field:
            if not re.match(f"^{field['pattern']}$", str(value)):
                errors.append(f"Field '{name}' must match pattern {field['pattern']}: got '{value}'")
    amount = params.get("amount")
    if amount is not None and float(amount) <= 0:
        errors.append("'amount' must be a positive number")
    return errors

def build_message(scheme: str, msg_type: str, params: dict, validate: bool = True) -> bytes:
    entry = get_entry(scheme, msg_type)

    # Validate params against registry field definitions
    errors = _validate_params(entry, params)
    if errors:
        raise ValueError("Validation errors: " + "; ".join(errors))

    # Auto-fill defaults
    if not params.get("msg_id") or params["msg_id"] == "auto":
        raw_id = f"MSGID-{msg_type.replace('.', '')}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        params["msg_id"] = raw_id[:MSG_ID_MAX_LEN]  # enforce SWIFT 35-char limit
    if not params.get("value_date") or params["value_date"] == "today":
        params["value_date"] = str(date.today())
    if not params.get("end_to_end_id"):
        params["end_to_end_id"] = "NOTPROVIDED"
    if not params.get("uetr"):
        params["uetr"] = str(uuid.uuid4())
    if not params.get("created_at"):
        params["created_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    if not params.get("tx_id"):
        params["tx_id"] = f"{datetime.utcnow().strftime('%Y%m%d')}-1-{uuid.uuid4().hex[:4].upper()}"

    try:
        template  = jinja_env.get_template(entry["template"])
    except TemplateNotFound:
        raise ValueError(f"Template not found: {entry['template']} — check TEMPLATES_DIR configuration")
    xml_str   = template.render(**params)
    xml_bytes = xml_str.encode("UTF-8")

    if validate:
        xsd_path = get_xsd_path(scheme, msg_type)
        result   = validate_xml_against_xsd_path(xml_bytes, xsd_path)
        if not result["valid"]:
            raise ValueError(f"XSD validation failed: {result['error']}")

    return xml_bytes
