# Admin CIBIL Check - Input & Output Flow
## Complete Documentation for ScoreNow Admin Portal

**User:** anita sa  
**Feature:** Client Reports / Credit Score Checker  
**Bureau:** CIBIL  
**Date Created:** 2026-11-16

---

## Overview

The Admin CIBIL Check feature allows authorized administrators to fetch a credit report for a client with their informed consent. This document details the complete data flow from input through to output.

---

## Part 1: INPUT

### 1.1 Admin Portal Form

**Location:** Frontend → `src/App.tsx` (lines 4702-4723)  
**Path:** Admin Dashboard → CLIENT REPORTS → Credit score checker

**Form Fields (Admin must fill all marked as *required):**

```
┌─────────────────────────────────────────────────┐
│         CLIENT REPORTS FORM                      │
├─────────────────────────────────────────────────┤
│ Bureau (dropdown)              *REQUIRED         │
│   Options: CIBIL, Equifax, Experian            │
│   Selected: CIBIL                              │
├─────────────────────────────────────────────────┤
│ Full name                      *REQUIRED         │
│   Input: Anita SA                              │
│   Min length: 2 characters                     │
│   Max length: 120 characters                   │
├─────────────────────────────────────────────────┤
│ PAN                            *REQUIRED         │
│   Pattern: [A-Za-z]{5}[0-9]{4}[A-Za-z]         │
│   Max length: 10 characters                    │
│   Example: ABCDE1234F                          │
├─────────────────────────────────────────────────┤
│ Date of birth                  *REQUIRED         │
│   Type: Date (YYYY-MM-DD)                      │
│   Format validated by browser                  │
├─────────────────────────────────────────────────┤
│ Mobile number                  *REQUIRED         │
│   Pattern: [0-9]{10}                           │
│   Max length: 10 digits                        │
│   No spaces or formatting                      │
├─────────────────────────────────────────────────┤
│ Email                          (OPTIONAL)        │
│   Type: email                                  │
│   Browser validation applied                   │
├─────────────────────────────────────────────────┤
│ Address                        *REQUIRED         │
│   Field name: addressLine1                     │
│   Max length: Unlimited (server validates)     │
│   Example: 123 Main Street                     │
├─────────────────────────────────────────────────┤
│ City                           *REQUIRED         │
│   Max length: Unlimited                        │
├─────────────────────────────────────────────────┤
│ State                          *REQUIRED         │
│   Dropdown with Indian states                  │
│   Pre-populated list of valid states           │
├─────────────────────────────────────────────────┤
│ PIN code                       *REQUIRED         │
│   Pattern: [0-9]{6}                            │
│   Exactly 6 digits                             │
├─────────────────────────────────────────────────┤
│ Gender                         *REQUIRED         │
│   Options: Female, Male, Other                 │
├─────────────────────────────────────────────────┤
│ ☑ I confirm the client has authorized          │
│   Scorenow to submit these details to the       │
│   selected credit bureau for this report        │
│   request.                     *REQUIRED         │
│   (Checkbox - must be checked)                 │
└─────────────────────────────────────────────────┘
```

### 1.2 Frontend Processing

**File:** `frontend/src/App.tsx` (lines 4151-4190)  
**Function:** `fetchReport()`

**Processing steps:**
1. Extract form data from HTML form
2. Create JSON payload with all fields
3. Validate consent checkbox is checked (`data.get('clientConsent') === 'on'`)

### 1.3 HTTP Request Sent to Backend

**Endpoint:** `POST /api/admin/reports`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer {admin_token}
```

**Request Body Example:**
```json
{
  "bureau": "cibil",
  "fullName": "Anita SA",
  "pan": "ABCDE1234F",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "mobile": "9876543210",
  "email": "anita@example.com",
  "addressLine1": "123 Sample Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "consent": true
}
```

### 1.4 Backend Input Validation

**File:** `backend/src/server.ts` (lines 1729-1760)  
**Function:** `POST /api/admin/reports` endpoint

**Validation checks:**

| Field | Validation Rule | Error Message |
|-------|-----------------|---------------|
| `bureau` | Must be valid bureau (cibil, equifax, experian) | "Choose a valid credit bureau." |
| `consent` | Must be `true` | "Confirm that the client has consented..." |
| Bureau availability | Must be configured in environment | "{Bureau} reports are not configured." |
| `fullName` | Length >= 2 chars | "Enter a valid full name..." |
| `pan` | Pattern: `^[A-Z]{5}[0-9]{4}[A-Z]$` | "Enter a valid full name, PAN..." |
| `dateOfBirth` | Pattern: `^\d{4}-\d{2}-\d{2}$` | "Enter a valid full name, PAN..." |
| `mobile` | Exactly 10 digits (non-numeric chars removed) | "Enter a valid...10-digit mobile number" |
| Required fields | Check by bureau type | "Enter {missing_fields} to request..." |

**Applicant Structure Created:**
```typescript
interface Applicant {
  fullName: string;
  pan: string;           // Uppercase
  dateOfBirth: string;   // YYYY-MM-DD format
  gender: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  mobile: string;        // 10 digits only
}
```

---

## Part 2: PROCESSING & DATABASE AUDIT

### 2.1 Admin Report Audit Record Creation

**File:** `backend/src/database.ts` (lines 852-876)  
**Function:** `createAdminReportAudit()`

**Database Table:** `admin_report_audit`

**Columns Created:**
```sql
INSERT INTO admin_report_audit (
  admin_id,
  bureau,
  pan_last4,
  pan_hash,
  mobile_last4,
  consent_granted,
  consent_text_version,
  consent_ip_address,
  status,
  applicant_details,
  created_at (auto)
)
VALUES (
  '{admin_id}',              -- Admin who performed the check
  'cibil',                   -- Bureau selected
  'F',                       -- Last 4 chars of PAN (e.g., "1234F")
  SHA256(PAN_UPPERCASE),     -- Secure hash of full PAN
  '3210',                    -- Last 4 digits of mobile
  TRUE,                      -- Consent flag
  'admin-client-consent-v1', -- Version of consent text
  '{ip_address}',            -- Admin's IP address
  'processing',              -- Initial status
  JSON_STRINGIFY({           -- Client details (PAN excluded for security)
    fullName: 'Anita SA',
    dateOfBirth: '1990-05-15',
    gender: 'female',
    addressLine1: '123 Sample Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    email: 'anita@example.com',
    mobile: '9876543210'
  })
)
```

**Security Note:** The PAN is NOT stored in plain text. Instead:
- PAN hash (SHA256) is stored
- Only last 4 digits of PAN are stored in plain text
- Only last 4 digits of mobile are stored
- Full applicant details are stored as JSON (minus PAN)

### 2.2 Bureau API Call

**File:** `backend/src/server.ts` (lines 1769-1776)  
**Function:** `fetchBureauReport(bureau, applicant, consentIpAddress)`

**Process:**
1. Call CIBIL API with applicant details
2. CIBIL returns:
   - Raw report data (JSON)
   - Provider transaction ID
   - Credit score
   - Account details, enquiries, personal info

### 2.3 Response from CIBIL

**Example CIBIL API Response Structure:**
```json
{
  "status": "success",
  "data": {
    "data": {
      "report_id": "REP123456789",
      "credit_score": 750,
      "pdf_report_url": "https://cibil.co.in/reports/...",
      "personal": {
        "name": "Anita SA",
        "pan": "ABCDE1234F",
        "dob": "1990-05-15",
        "phones": ["9876543210"],
        "addresses": ["123 Sample Street, Mumbai"]
      },
      "accounts": [
        {
          "lender": "HDFC Bank",
          "accountNumber": "****5678",
          "type": "Credit Card",
          "status": "active",
          "currentBalance": 50000,
          "creditLimit": 200000,
          "overdueAmount": 0
        }
      ],
      "enquiries": [
        {
          "lender": "ICICI Bank",
          "date": "2026-10-15",
          "purpose": "Home Loan"
        }
      ]
    }
  },
  "provider_transaction_id": "TXN123456789"
}
```

### 2.4 Report Normalization

**File:** `backend/src/server.ts` (lines 1777-1784)  
**Function:** `normalizeReport(bureau, result.raw)`

**Normalizes CIBIL data into standard format:**
```typescript
interface NormalizedReport {
  score: number;                    // e.g., 750
  personal: {
    name: string;
    pan: string;
    dateOfBirth: string;
    phones: string[];
    emails: string[];
    addresses: string[];
  };
  accounts: {
    lender: string;
    type: string;
    accountNumber: string;
    status: string;
    openedOn: string;
    currentBalance: number;
    creditLimit: number;
    overdueAmount: number;
  }[];
  enquiries: {
    lender: string;
    date: string;
    amount?: number;
    purpose?: string;
  }[];
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    closedAccounts: number;
    overdueAccounts: number;
    totalBalance: number;
    totalOverdue: number;
    enquiriesLast6Months: number;
  };
}
```

### 2.5 Document Capture

**File:** `backend/src/server.ts` (lines 1785-1787)  
**Function:** `captureBureauDocument()`

**Process:**
1. If CIBIL provides HTML report: Save HTML
2. Extract PDF report URL from CIBIL response
3. Generate PDF if not available
4. Save both HTML and PDF to database

**Storage:**
- Table: `admin_report_audit` columns
  - `report_html`: HTML version stored
  - `report_pdf`: Binary PDF stored

### 2.6 Admin Report Audit Completion

**File:** `backend/src/database.ts` (lines 878-903)  
**Function:** `completeAdminReportAudit()`

**Final Database Update:**
```sql
UPDATE admin_report_audit SET
  status = 'completed',                    -- or 'failed'
  provider_transaction_id = 'TXN123456789',
  credit_score = 750,
  failure_reason = NULL,                   -- NULL if success
  provider_response = JSON({...}),         -- Full raw response
  normalized_report = JSON({...}),         -- Normalized data
  completed_at = NOW()
WHERE id = {audit_id}
```

---

## Part 3: OUTPUT

### 3.1 Frontend Response

**HTTP Response (200 OK):**
```json
{
  "auditId": "42",
  "bureau": "cibil",
  "providerTxnId": "TXN123456789",
  "report": {
    "score": 750,
    "reportDate": "2026-11-16",
    "personal": {
      "name": "Anita SA",
      "pan": "ABCDE1234F",
      "dateOfBirth": "1990-05-15",
      "phones": ["9876543210"],
      "emails": ["anita@example.com"],
      "addresses": ["123 Sample Street, Mumbai"]
    },
    "summary": {
      "totalAccounts": 3,
      "activeAccounts": 2,
      "closedAccounts": 1,
      "overdueAccounts": 0,
      "totalBalance": 150000,
      "totalOverdue": 0,
      "enquiriesLast6Months": 1
    },
    "accounts": [
      {
        "lender": "HDFC Bank",
        "type": "Credit Card",
        "accountNumber": "****5678",
        "status": "active",
        "openedOn": "2020-03-15",
        "currentBalance": 50000,
        "creditLimit": 200000,
        "overdueAmount": 0
      },
      {
        "lender": "ICICI Bank",
        "type": "Personal Loan",
        "accountNumber": "****9012",
        "status": "active",
        "openedOn": "2019-06-20",
        "currentBalance": 100000,
        "creditLimit": 100000,
        "overdueAmount": 0
      },
      {
        "lender": "SBI",
        "type": "Credit Card",
        "accountNumber": "****3456",
        "status": "closed",
        "openedOn": "2018-01-10",
        "currentBalance": 0,
        "creditLimit": 150000,
        "overdueAmount": 0
      }
    ],
    "enquiries": [
      {
        "lender": "Axis Bank",
        "date": "2026-10-15",
        "amount": 500000,
        "purpose": "Home Loan"
      }
    ]
  }
}
```

### 3.2 UI Display - Admin Report Result

**Location:** `frontend/src/App.tsx` (lines 4728-4755)

**What Admin Sees:**

```
┌─────────────────────────────────────────────────────────────┐
│  CIBIL REPORT                                               │
│  Anita SA                                      ┌──────────┐  │
│                                                │ 750      │  │
│                                              │ Credit    │  │
│                                              │ score     │  │
│                                                └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Total accounts    │ 3      │ Active        │ 2             │
│ Closed            │ 1      │ Overdue accts │ 0             │
│ Outstanding       │ ₹1.5L  │ Overdue amt   │ ₹0            │
│ Enquiries (6m)    │ 1      │                              │
├─────────────────────────────────────────────────────────────┤
│ CLIENT DETAILS                                              │
│ PAN              ABCDE1234F                                │
│ Date of birth    15-05-1990                               │
│ Phone            9876543210                               │
│ Email            anita@example.com                        │
│ Address          123 Sample Street, Mumbai                │
├─────────────────────────────────────────────────────────────┤
│ CREDIT ENQUIRIES (1 total)                                  │
│ • Axis Bank                                                │
│   Home Loan · ₹5,00,000 · 15-10-2026                       │
├─────────────────────────────────────────────────────────────┤
│ CREDIT ACCOUNTS (3 accounts)                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ HDFC Bank - Credit Card ····5678                    │    │
│ │ Balance: ₹50,000 | Limit: ₹2,00,000 | Overdue: ₹0  │    │
│ │ Opened: 15-03-2020                     ACTIVE      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ICICI Bank - Personal Loan ····9012                 │    │
│ │ Balance: ₹1,00,000 | Limit: ₹1,00,000 | Overdue: ₹0│    │
│ │ Opened: 20-06-2019                     ACTIVE      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ SBI - Credit Card ····3456                          │    │
│ │ Balance: ₹0 | Limit: ₹1,50,000 | Overdue: ₹0       │    │
│ │ Opened: 10-01-2018                     CLOSED      │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┐
│ [ ⬇ Download report ]              │
│                                    │
│ ℹ The download is the original     │
│ bureau report (for CIBIL, the      │
│ bureau's own report saved at the   │
│ time of the check).                │
└────────────────────────────────────┘
```

### 3.3 Download Report Option

**File:** `frontend/src/App.tsx` (lines 4190-4220)  
**Endpoint:** `GET /api/admin/reports/{auditId}/pdf`

**Output File:**
- Filename: `ScoreNow-cibil-report-2026-11-16.pdf`
- Format: Bureau's original PDF (if available)
- Fallback: ScoreNow-generated summary PDF
- Content-Type: `application/pdf`

### 3.4 Database - Final Audit Record

**Table:** `admin_report_audit`

**Sample Record:**
```
id                          | 42
admin_id                    | admin@scorenow.in
bureau                      | cibil
pan_last4                   | 1234F (masked)
pan_hash                    | e3b0c44298fc1c149afbf4c8996fb92427ae41e... (SHA256)
mobile_last4                | 3210
consent_granted             | TRUE
consent_text_version        | admin-client-consent-v1
consent_ip_address          | 192.168.1.100
status                      | completed
applicant_details           | {"fullName":"Anita SA","dateOfBirth":"1990-05-15",...}
provider_transaction_id     | TXN123456789
credit_score                | 750
failure_reason              | NULL
provider_response           | {full CIBIL JSON response}
normalized_report           | {normalized report JSON}
report_pdf                  | {binary PDF data}
report_html                 | {HTML content}
created_at                  | 2026-11-16 14:30:45 UTC
completed_at                | 2026-11-16 14:31:12 UTC
```

### 3.5 Admin Activity Audit

**File:** `backend/src/server.ts` (lines 1776)  
**Function:** `auditAdmin()` records the action

**Audit Log Entry:**
```json
{
  "action": "manual_bureau_check",
  "admin_id": "admin@scorenow.in",
  "timestamp": "2026-11-16T14:30:45Z",
  "ip_address": "192.168.1.100",
  "type": "admin_report",
  "details": {
    "bureau": "cibil",
    "id": "42",
    "mobileLast4": "3210",
    "panLast4": "1234F"
  }
}
```

---

## Part 4: ERROR SCENARIOS

### 4.1 Invalid Input Errors

**Invalid PAN Format:**
```
Input: ABC123456 (not 10 chars)
Response: 400 Bad Request
{
  "message": "Enter a valid full name, PAN, date of birth, and 10-digit mobile number."
}
```

**Missing Required Fields:**
```
Input: addressLine1 = "", city = ""
Response: 400 Bad Request
{
  "message": "Enter address, city to request this report."
}
```

**Consent Not Given:**
```
Input: consent = false
Response: 400 Bad Request
{
  "message": "Confirm that the client has consented to this bureau report request."
}
```

### 4.2 Bureau Configuration Errors

**Bureau Not Configured:**
```
Response: 503 Service Unavailable
{
  "message": "CIBIL reports are not configured."
}
```

### 4.3 Provider API Errors

**CIBIL API Failure:**
```
Response: 502 Bad Gateway
{
  "message": "Unable to fetch this credit report.",
  "diagnostics": {
    "provider": "cibil",
    "reason": "Invalid applicant details"
  }
}
```

**Database Update:**
- Status: `failed`
- failure_reason: Error message (max 500 chars)
- provider_response: Full error response from CIBIL
- completed_at: Timestamp of failure

---

## Part 5: Security & Compliance

### 5.1 Authentication & Authorization

- **Requirement:** Valid admin session token
- **Header:** `Authorization: Bearer {token}`
- **Roles permitted:** owner, manager
- **Session expiry:** Checked at endpoint

### 5.2 Data Protection

- **PAN Storage:** 
  - ✅ Only last 4 digits in plain text
  - ✅ Full PAN hashed with SHA256
  - ✅ Not stored in audit log
  
- **Mobile Storage:**
  - ✅ Only last 4 digits in plain text
  - ✅ Not stored in audit log

- **Applicant Details:**
  - ✅ Stored as JSON (excluding PAN)
  - ✅ Accessible only to authorized admins

### 5.3 Consent Management

- **Consent Type:** Admin confirms client authorization
- **Version Tracking:** `admin-client-consent-v1`
- **IP Capture:** Admin's IP address recorded
- **Flag:** Boolean `consent_granted = TRUE`

### 5.4 Audit Trail

- **Action Recorded:** `manual_bureau_check`
- **Timestamp:** Exact time of request
- **Admin ID:** Who performed the check
- **IP Address:** Request source
- **Bureau Used:** Which bureau
- **Last 4 Digits:** PAN and mobile last 4

---

## Part 6: Complete Request/Response Example

### 6.1 Full Admin Check Session

```
TIMESTAMP: 2026-11-16T14:30:45Z
ADMIN: Anurag (admin_id: anurag@scorenow.in)
CLIENT: Anita SA
```

**STEP 1: Admin fills form in browser**
```
Bureau: CIBIL
Full Name: Anita SA
PAN: ABCDE1234F
DOB: 15-05-1990
Mobile: 9876543210
Email: anita@example.com
Address: 123 Sample Street
City: Mumbai
State: Maharashtra
PIN: 400001
Gender: Female
Consent: ☑ Checked
```

**STEP 2: Frontend sends POST request**
```
POST /api/admin/reports HTTP/1.1
Host: api.scorenow.in
Content-Type: application/json
Authorization: Bearer eyJhbGci...

{
  "bureau": "cibil",
  "fullName": "Anita SA",
  "pan": "ABCDE1234F",
  "dateOfBirth": "1990-05-15",
  "gender": "female",
  "mobile": "9876543210",
  "email": "anita@example.com",
  "addressLine1": "123 Sample Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "consent": true
}
```

**STEP 3: Backend validates and creates audit record**
- Admin: anurag@scorenow.in
- Bureau: cibil
- Status: processing
- IP: 203.0.113.42
- Timestamp: 2026-11-16T14:30:45Z

**STEP 4: Backend calls CIBIL API**
- Sends applicant details
- Waits for response (typically 2-5 seconds)

**STEP 5: CIBIL returns report**
- Credit score: 750
- Accounts: 3 (2 active, 1 closed)
- Enquiries: 1
- Latest transaction ID: TXN123456789

**STEP 6: Backend normalizes and stores report**
- Normalize CIBIL response to standard format
- Save HTML and PDF
- Update audit record with status: completed
- Store provider_transaction_id and credit_score

**STEP 7: Backend returns response**
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "auditId": "42",
  "bureau": "cibil",
  "providerTxnId": "TXN123456789",
  "report": {
    "score": 750,
    "reportDate": "2026-11-16",
    "personal": { ... },
    "summary": { ... },
    "accounts": [ ... ],
    "enquiries": [ ... ]
  }
}
```

**STEP 8: Frontend displays report**
- Shows credit score: 750
- Displays account details
- Shows enquiries
- Provides download button

**STEP 9: Admin downloads PDF**
```
GET /api/admin/reports/42/pdf HTTP/1.1
Authorization: Bearer eyJhbGci...

HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="ScoreNow-cibil-report-2026-11-16.pdf"
X-Report-Source: bureau
```

---

## Part 7: Related Operations

### 7.1 Viewing Admin Check History

**Endpoint:** `GET /api/admin/customers/{id}` (with customer detail)

**Returns:** History of all admin checks for that customer's PAN

### 7.2 Failed Operations Retry

**Endpoint:** `POST /api/admin/report-requests/{id}/retry`

**Allows:** Retrying failed CIBIL checks

### 7.3 Admin Report PDF Download

**Endpoint:** `GET /api/admin/reports/{auditId}/pdf`

**Returns:** Original CIBIL PDF or ScoreNow summary

---

## Summary

| Aspect | Details |
|--------|---------|
| **Input Method** | Web form with 11 fields |
| **Bureau** | CIBIL, Equifax, Experian |
| **Key Fields** | Full Name, PAN, DOB, Mobile, Address, City, State, PIN, Email, Gender |
| **Processing** | Real-time API call to bureau |
| **Output** | Credit score + detailed report (accounts, enquiries, personal info) |
| **Storage** | Database with normalized report + original response |
| **Security** | PAN/Mobile hashed or masked, audit trail maintained |
| **Download** | PDF format (bureau original or ScoreNow summary) |
| **Admin Controls** | Can only be performed by authorized admins (owner/manager) |

