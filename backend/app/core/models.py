from pydantic import BaseModel
from typing import Optional
from datetime import date

class Pacs008Request(BaseModel):
    debtor_name: str
    debtor_iban: str
    debtor_bic: str
    debtor_street: Optional[str] = None
    debtor_postcode: Optional[str] = None
    debtor_city: Optional[str] = None
    debtor_country: Optional[str] = None
    creditor_name: str
    creditor_iban: str
    creditor_bic: str
    creditor_street: Optional[str] = None
    creditor_postcode: Optional[str] = None
    creditor_city: Optional[str] = None
    creditor_country: Optional[str] = None
    amount: float
    currency: str = "CHF"
    value_date: Optional[date] = None
    end_to_end_ref: Optional[str] = None
    remittance_info: Optional[str] = None
