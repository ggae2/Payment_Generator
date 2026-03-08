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
                "debtor_street":  {"type": "string", "description": "Debtor street name"},
                "debtor_postcode":{"type": "string", "description": "Debtor postal code"},
                "debtor_city":    {"type": "string", "description": "Debtor city/town"},
                "debtor_country": {"type": "string", "description": "Debtor country code e.g. CH"},
                "creditor_name":  {"type": "string"},
                "creditor_iban":  {"type": "string"},
                "creditor_iid":   {"type": "string", "description": "SIC IID 6 digits e.g. 092052"},
                "creditor_street":  {"type": "string", "description": "Creditor street name"},
                "creditor_postcode":{"type": "string", "description": "Creditor postal code"},
                "creditor_city":    {"type": "string", "description": "Creditor city/town"},
                "creditor_country": {"type": "string", "description": "Creditor country code e.g. CH"},
                "amount":         {"type": "number"},
                "currency":       {"type": "string", "enum": ["CHF","EUR"], "default": "CHF"},
                "value_date":     {"type": "string", "description": "YYYY-MM-DD"},
                "remittance":     {"type": "string"},
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
        "name": "validate_iban",
        "description": "Validate an IBAN",
        "input_schema": {
            "type": "object",
            "properties": {"iban": {"type": "string"}},
            "required": ["iban"]
        }
    }
]