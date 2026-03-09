from pathlib import Path

SCHEMAS_DIR   = Path(__file__).parent.parent / "schemas_xsd"
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

REGISTRY = {
    "sic": {
        "pacs.008": {
            "label":    "FI-to-FI Customer Credit Transfer (SIC)",
            "template": "sic/pacs.008.001.08.ch.02.xml.j2",
            "xsd":      "SIC/pacs.008.001.08.ch.02.xsd",
            "fields": [
                {"name": "msg_id",        "label": "Message ID",          "type": "string",  "required": False, "default": "auto"},
                {"name": "debtor_name",   "label": "Debtor Name",         "type": "string",  "required": True},
                {"name": "debtor_iban",   "label": "Debtor IBAN",         "type": "iban",    "required": True},
                {"name": "debtor_iid",    "label": "Debtor IID (SIC)",    "type": "string",  "required": True,  "pattern": "[0-9]{6}"},
                {"name": "creditor_name", "label": "Creditor Name",       "type": "string",  "required": True},
                {"name": "creditor_iban", "label": "Creditor IBAN",       "type": "iban",    "required": True},
                {"name": "creditor_iid",  "label": "Creditor IID (SIC)",  "type": "string",  "required": True,  "pattern": "[0-9]{6}"},
                {"name": "amount",        "label": "Amount",              "type": "decimal", "required": True},
                {"name": "currency",      "label": "Currency",            "type": "enum",    "required": True,  "options": ["CHF", "EUR"], "default": "CHF"},
                {"name": "value_date",    "label": "Value Date",          "type": "date",    "required": False, "default": "today"},
                {"name": "end_to_end_id", "label": "End-to-End ID",       "type": "string",  "required": False, "default": "NOTPROVIDED"},
                {"name": "remittance",    "label": "Remittance Info",     "type": "string",  "required": False},
            ]
        },
        "camt.056": {
            "label":    "FI-to-FI Payment Cancellation Request (SIC)",
            "template": "sic/camt.056.001.08.ch.04.xml.j2",
            "xsd":      "SIC/camt.056.001.08.ch.04.xsd",
            "fields": [
                {"name": "assgnr_iid",       "label": "Assignor IID (sender)",   "type": "string",  "required": True,  "pattern": "[0-9]{6}"},
                {"name": "assgne_iid",        "label": "Assignee IID (receiver)", "type": "string",  "required": True,  "pattern": "[0-9]{6}"},
                {"name": "orig_msg_id",       "label": "Original Message ID",     "type": "string",  "required": True},
                {"name": "orig_tx_id",        "label": "Original Transaction ID", "type": "string",  "required": True},
                {"name": "orig_uetr",         "label": "Original UETR",           "type": "string",  "required": False},
                {"name": "orig_amount",       "label": "Original Amount",         "type": "decimal", "required": True},
                {"name": "orig_currency",     "label": "Original Currency",       "type": "enum",    "required": True,  "options": ["CHF", "EUR"]},
                {"name": "orig_value_date",   "label": "Original Value Date",     "type": "date",    "required": True},
                {"name": "orig_msg_nm_id",    "label": "Original Msg Name ID",    "type": "string",  "required": False, "default": "pacs.008.001.08"},
                {"name": "cxl_reason_code",   "label": "Cancellation Reason",     "type": "enum",    "required": False, "default": "CUST",
                 "options": ["CUST", "DUPL", "AGNT", "UPAY", "TECH", "FRAD", "CUTA", "CURR"]},
                {"name": "cxl_reason_info",   "label": "Additional Info",         "type": "string",  "required": False},
                {"name": "assgnr_name",       "label": "Assignor Name",           "type": "string",  "required": False},
            ]
        }
        # Ajouter pacs.009, camt.054, etc. ici
    },
    "sepa": {
        # Ajouter messages SEPA ici
    },
    "swift": {
        # Ajouter messages SWIFT ici
    }
}

def get_entry(scheme: str, msg_type: str) -> dict:
    entry = REGISTRY.get(scheme, {}).get(msg_type)
    if not entry:
        raise ValueError(f"Unknown scheme/type: {scheme}/{msg_type}")
    return entry

def get_xsd_path(scheme: str, msg_type: str) -> Path:
    return SCHEMAS_DIR / get_entry(scheme, msg_type)["xsd"]

def get_template_path(scheme: str, msg_type: str) -> str:
    return get_entry(scheme, msg_type)["template"]
