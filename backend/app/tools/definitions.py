TOOLS = [
    {
        "name": "generate_pacs008",
        "description": "Generate a pacs.008 SIC incoming test file (ISO 20022 Swiss interbank)",
        "input_schema": {
            "type": "object",
            "properties": {
                "debtor_name":    {"type": "string"},
                "debtor_iban":    {"type": "string"},
                "debtor_iid":     {"type": "string", "description": "SIC IID 6 digits e.g. 098064"},
                "debtor_bic":     {"type": "string", "description": "Debtor BIC/SWIFT code e.g. UBSWCHZH80A"},
                "debtor_street":  {"type": "string", "description": "Debtor street name"},
                "debtor_postcode":{"type": "string", "description": "Debtor postal code"},
                "debtor_city":    {"type": "string", "description": "Debtor city/town"},
                "debtor_country": {"type": "string", "description": "Debtor country code e.g. CH"},
                "creditor_name":  {"type": "string"},
                "creditor_iban":  {"type": "string"},
                "creditor_iid":   {"type": "string", "description": "SIC IID 6 digits e.g. 092052"},
                "creditor_bic":   {"type": "string", "description": "Creditor BIC/SWIFT code e.g. CRESCHZZ80A"},
                "creditor_street":  {"type": "string", "description": "Creditor street name"},
                "creditor_postcode":{"type": "string", "description": "Creditor postal code"},
                "creditor_city":    {"type": "string", "description": "Creditor city/town"},
                "creditor_country": {"type": "string", "description": "Creditor country code e.g. CH"},
                "amount":         {"type": "number"},
                "currency":       {"type": "string", "enum": ["CHF","EUR"], "default": "CHF"},
                "value_date":     {"type": "string", "description": "YYYY-MM-DD"},
                "remittance":     {"type": "string"},
                "envelope":       {"type": "boolean", "description": "Wrap in head.001.001.02 BAH envelope (BizMsgEnvlp + AppHdr). Set true for gateway/CSM-layer testing.", "default": False},
            },
            "required": ["debtor_name","debtor_iban","debtor_iid","creditor_name","creditor_iban","creditor_iid","amount"]
        }
    },
    {
        "name": "generate_batch_pacs008",
        "description": "Generate multiple pacs.008 SIC files for batch/stress/scenario testing",
        "input_schema": {
            "type": "object",
            "properties": {
                "count":         {"type": "integer"},
                "creditor_name": {"type": "string"},
                "creditor_iban": {"type": "string"},
                "creditor_iid":  {"type": "string", "description": "SIC IID 6 digits"},
                "currency":      {"type": "string", "enum": ["CHF","EUR"], "default": "CHF"},
                "amount_range":  {"type": "array", "items": {"type": "number"}, "description": "[min, max]"},
                "scenario":      {"type": "string", "enum": ["normal","duplicate","invalid_iban","future_dates","high_value"], "default": "normal"},
            },
            "required": ["count","creditor_name","creditor_iban","creditor_iid"]
        }
    },
    {
        "name": "generate_camt056",
        "description": "Generate a camt.056 SIC payment cancellation request (recall) referencing a previous pacs.008 transaction",
        "input_schema": {
            "type": "object",
            "properties": {
                "assgnr_iid":     {"type": "string", "description": "Assignor IID — the bank sending the recall (6 digits)"},
                "assgne_iid":     {"type": "string", "description": "Assignee IID — the bank receiving the recall (6 digits)"},
                "orig_msg_id":    {"type": "string", "description": "Message ID of the original pacs.008"},
                "orig_tx_id":     {"type": "string", "description": "Transaction ID of the original pacs.008"},
                "orig_uetr":      {"type": "string", "description": "UETR of the original pacs.008 (UUID format)"},
                "orig_amount":    {"type": "number", "description": "Amount of the original payment"},
                "orig_currency":  {"type": "string", "enum": ["CHF", "EUR"], "default": "CHF"},
                "orig_value_date":{"type": "string", "description": "Value date of the original payment YYYY-MM-DD"},
                "cxl_reason_code":{"type": "string", "enum": ["CUST","DUPL","AGNT","UPAY","TECH","FRAD","CUTA","CURR"], "default": "CUST",
                                   "description": "Cancellation reason code: CUST=customer request, DUPL=duplicate, FRAD=fraud, TECH=technical issue"},
                "cxl_reason_info":{"type": "string", "description": "Free-text explanation for the recall"},
                "assgnr_name":    {"type": "string", "description": "Name of the recalling bank"},
                "envelope":       {"type": "boolean", "description": "Wrap in head.001.001.02 BAH envelope. Set true for gateway/CSM-layer testing.", "default": False},
            },
            "required": ["assgnr_iid", "assgne_iid", "orig_msg_id", "orig_tx_id", "orig_amount", "orig_currency", "orig_value_date"]
        }
    },
    {
        "name": "generate_pacs008_sepa",
        "description": "Generate a pacs.008 SEPA SCT Inter-PSP incoming test file (EPC scheme, EUR only, BIC-routed)",
        "input_schema": {
            "type": "object",
            "properties": {
                "debtor_name":      {"type": "string", "description": "Debtor (originator PSP) name"},
                "debtor_iban":      {"type": "string", "description": "Debtor IBAN e.g. FR7630006000011234567890189"},
                "debtor_bic":       {"type": "string", "description": "Debtor BIC/SWIFT code e.g. BNPAFRPPXXX"},
                "debtor_street":    {"type": "string"},
                "debtor_postcode":  {"type": "string"},
                "debtor_city":      {"type": "string"},
                "debtor_country":   {"type": "string", "description": "ISO 2-letter country code e.g. FR"},
                "creditor_name":    {"type": "string", "description": "Creditor (beneficiary PSP) name"},
                "creditor_iban":    {"type": "string", "description": "Creditor IBAN e.g. DE89370400440532013000"},
                "creditor_bic":     {"type": "string", "description": "Creditor BIC/SWIFT code e.g. DEUTDEBBXXX"},
                "creditor_street":  {"type": "string"},
                "creditor_postcode":{"type": "string"},
                "creditor_city":    {"type": "string"},
                "creditor_country": {"type": "string", "description": "ISO 2-letter country code e.g. DE"},
                "amount":           {"type": "number", "description": "Amount in EUR (0.01 – 999999999.99)"},
                "value_date":       {"type": "string", "description": "Settlement date YYYY-MM-DD"},
                "remittance":       {"type": "string", "description": "Unstructured remittance info (max 140 chars)"},
                "envelope":         {"type": "boolean", "description": "Wrap in head.001.001.02 BAH envelope. Set true for gateway/CSM-layer testing.", "default": False},
            },
            "required": ["debtor_name", "debtor_iban", "debtor_bic", "creditor_name", "creditor_iban", "creditor_bic", "amount"]
        }
    },
    {
        "name": "validate_iban",
        "description": "Validate an IBAN",
        "input_schema": {
            "type": "object",
            "properties": {"iban": {"type": "string"}},
            "required": ["iban"]
        }
    }
]