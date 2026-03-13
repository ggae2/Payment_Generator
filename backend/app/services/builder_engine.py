import re
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from pathlib import Path
from datetime import datetime, date
import uuid
import logging
from app.core.registry import get_entry, get_xsd_path, TEMPLATES_DIR
from app.services.validator import validate_xml_against_xsd_path

logger = logging.getLogger(__name__)

# MsgDefIdr mapping for BAH head.001.001.02
_MSG_DEF_IDR = {
    "pacs.008": "pacs.008.001.08",
    "pacs.009": "pacs.009.001.08",
    "camt.056": "camt.056.001.08",
    "camt.029": "camt.029.001.09",
    "camt.054": "camt.054.001.08",
}

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


def build_message(scheme: str, msg_type: str, params: dict, validate: bool = True, envelope: bool = False) -> bytes:
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
    if not params.get("cxl_id"):
        params["cxl_id"] = f"CXL-{uuid.uuid4().hex[:12].upper()}"[:35]
    if not params.get("assgnmt_id"):
        params["assgnmt_id"] = f"ASSGNMT-{uuid.uuid4().hex[:8].upper()}"[:35]
    if not params.get("orig_msg_nm_id"):
        params["orig_msg_nm_id"] = "pacs.008.001.08"
    if not params.get("cxl_reason_code"):
        params["cxl_reason_code"] = "CUST"

    try:
        template = jinja_env.get_template(entry["template"])
    except TemplateNotFound:
        raise ValueError(f"Template not found: {entry['template']} — check TEMPLATES_DIR configuration")

    xml_str   = template.render(**params)
    xml_bytes = xml_str.encode("UTF-8")

    if validate:
        xsd_path = get_xsd_path(scheme, msg_type)
        result   = validate_xml_against_xsd_path(xml_bytes, xsd_path)
        if not result["valid"]:
            raise ValueError(f"XSD validation failed: {result['error']}")

    if envelope:
        xml_bytes = wrap_bah(xml_bytes, params, msg_type)

    return xml_bytes


def wrap_bah(xml_bytes: bytes, params: dict, msg_type: str) -> bytes:
    """Wrap a validated ISO 20022 Document in a head.001.001.02 BAH envelope."""
    inner = xml_bytes.decode("UTF-8")
    # Strip the inner XML declaration — the envelope supplies its own
    if inner.startswith("<?xml"):
        inner = inner[inner.index("?>") + 2:].lstrip()

    sender_bic   = params.get("debtor_bic",   params.get("sender_bic",   "XXXXXX00XXX"))
    receiver_bic = params.get("creditor_bic", params.get("receiver_bic", "XXXXXX00XXX"))
    msg_def_idr  = _MSG_DEF_IDR.get(msg_type, msg_type)
    biz_msg_idr  = params.get("msg_id", f"BAH-{uuid.uuid4().hex[:8].upper()}")[:35]
    created_at   = params.get("created_at", datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"))

    try:
        bah_tpl = jinja_env.get_template("shared/head.001.001.02.xml.j2")
    except TemplateNotFound:
        raise ValueError("BAH envelope template not found: templates/shared/head.001.001.02.xml.j2")

    enveloped = bah_tpl.render(
        sender_bic=sender_bic,
        receiver_bic=receiver_bic,
        biz_msg_idr=biz_msg_idr,
        msg_def_idr=msg_def_idr,
        created_at=created_at,
        document_xml=inner,
    )
    return enveloped.encode("UTF-8")
