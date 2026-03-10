import random
import logging
from datetime import date, timedelta
from app.services.builder_engine import build_message

logger = logging.getLogger(__name__)

# Correct 6-digit SIC IIDs (pattern [0-9]{6} required by XSD)
BANKS = [
    {"name": "UBS AG",        "iban": "CH9300762011623852957", "iid": "000762"},
    {"name": "Credit Suisse", "iban": "CH5604835012345678009", "iid": "004835"},
    {"name": "Raiffeisen",    "iban": "CH3608387000001234567", "iid": "080837"},
    {"name": "PostFinance",   "iban": "CH5600000000000000001", "iid": "009000"},
    {"name": "ZKB Zurich",    "iban": "CH9300762011623852100", "iid": "000700"},
]


def _iban_mod97(iban: str) -> bool:
    """Validate IBAN using ISO 7064 MOD-97-10."""
    iban = iban.replace(" ", "").upper()
    if len(iban) < 5:
        return False
    rearranged = iban[4:] + iban[:4]
    numeric = "".join(
        str(ord(ch) - ord("A") + 10) if ch.isalpha() else ch
        for ch in rearranged
    )
    try:
        return int(numeric) % 97 == 1
    except ValueError:
        return False

def handle_tool_call(name: str, inputs: dict) -> dict:
    if name == "generate_pacs008":
        xml = build_message("sic", "pacs.008", inputs)
        return {"xml": xml.decode(), "message_type": "pacs.008"}

    elif name == "generate_batch_pacs008":
        count    = min(int(inputs.get("count", 1)), 50)  # cap at 50 files
        scenario = inputs.get("scenario", "normal")
        amin, amax = inputs.get("amount_range", [100, 50000])
        files    = []
        ref_amt  = None

        shared_uetr     = None  # reused across duplicate files
        shared_e2e_id   = None

        for i in range(count):
            bank   = random.choice(BANKS)
            amount = round(random.uniform(amin, amax), 2)
            vdate  = date.today() + timedelta(days=random.randint(0, 3))

            if scenario == "high_value":   amount = round(random.uniform(100_000, 10_000_000), 2)
            if scenario == "future_dates": vdate  = date.today() + timedelta(days=random.randint(5, 30))
            if i == 0: ref_amt = amount
            # Duplicate: identical amount + same UETR/E2EId — simulates true payment duplicates
            if scenario == "duplicate" and i > 0:
                amount = ref_amt

            creditor_iban = inputs["creditor_iban"]
            # invalid_iban: corrupt the last file intentionally — skip XSD validation so it can still be built
            is_bad = scenario == "invalid_iban" and i == count - 1
            if is_bad:
                creditor_iban = "CH00INVALID000000000"

            import uuid as _uuid
            if scenario == "duplicate":
                if i == 0:
                    shared_uetr   = str(_uuid.uuid4())
                    shared_e2e_id = f"E2E-DUP-{_uuid.uuid4().hex[:8].upper()}"
            params = {
                "debtor_name":    bank["name"],
                "debtor_iban":    bank["iban"],
                "debtor_iid":     bank["iid"],
                "creditor_name":  inputs["creditor_name"],
                "creditor_iban":  creditor_iban,
                "creditor_iid":   inputs["creditor_iid"],
                "amount":         amount,
                "currency":       inputs.get("currency", "CHF"),
                "value_date":     str(vdate),
                # Inject shared identifiers for true duplicate simulation
                **(  {"uetr": shared_uetr, "end_to_end_id": shared_e2e_id}
                     if scenario == "duplicate" and shared_uetr else {}
                  ),
            }
            try:
                xml = build_message("sic", "pacs.008", params, validate=not is_bad)
                files.append({
                    "name":       f"pacs008_{i+1:03}.xml",
                    "content":    xml.decode(),
                    "amount":     amount,
                    "value_date": str(vdate),
                    "debtor":     bank["name"],
                    "invalid":    is_bad,
                })
            except Exception as exc:
                logger.warning(f"Batch file {i+1} skipped — {exc}")
                files.append({"name": f"pacs008_{i+1:03}_ERROR.txt", "content": str(exc), "invalid": True})

        return {"files": files, "count": len(files), "scenario": scenario}

    elif name == "validate_iban":
        iban    = inputs["iban"].replace(" ", "").upper()
        valid   = _iban_mod97(iban)
        country = iban[:2] if len(iban) >= 2 else ""
        return {"iban": iban, "valid": valid, "country": country, "length": len(iban)}

    return {"error": f"Unknown tool: {name}"}