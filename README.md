# SIC / SEPA Incoming Test File Generator

Hybrid Agent + Form interface for generating ISO 20022 XML test files.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # add ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Add XSD Schemas
Download ISO 20022 XSD files into `backend/app/schemas_xsd/`:
- pacs.008.001.08.xsd
- pain.001.001.09.xsd  
- pacs.002.001.10.xsd
- camt.054.001.08.xsd

Source: https://www.iso20022.org/catalogue-messages/iso-20022-messages-archive

## Message Types Supported
| Type     | Description                          |
|----------|--------------------------------------|
| pacs.008 | FI-to-FI Customer Credit Transfer    |
| pain.001 | Customer Credit Transfer Initiation  |
| pacs.002 | Payment Status Report                |
| camt.054 | Bank-to-Customer Debit/Credit Notif. |

## Test Scenarios (Agent)
- Normal single payment
- Batch (N transactions, varied banks/amounts)
- Duplicate detection test
- Invalid IBAN rejection test
- High-value threshold test
- Future value date test
