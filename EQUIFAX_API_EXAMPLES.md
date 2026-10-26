# Equifax API Request/Response Examples

## Request Example

### Endpoint
```
POST https://b2b.payprime.in/api/equifax-ccr
Content-Type: application/json
```

### Complete Request Payload
```json
{
  "token": "your_payprime_api_token",
  "name": "Rahul Goyal",
  "id_type": "pan",
  "id_number": "BJSPG8612A",
  "phone": "9988991300",
  "dob": "1990-05-15",
  "state": "Maharashtra",
  "address": "123 Main Street, Building A, Apartment 5",
  "pincode": "400001",
  "consent_text": "I approve TransBnk to capture and process user data based on user consent",
  "consent": {
    "consentFlag": true,
    "consentTimestamp": "2026-10-26T19:22:23.353Z",
    "consentIpAddress": "192.168.1.100",
    "consentMessageId": "CM_1"
  }
}
```

### Field Descriptions

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `token` | string | `"abc123xyz"` | API authentication token from Payprime |
| `name` | string | `"Rahul Goyal"` | Full name (first + last) |
| `id_type` | string | `"pan"` | Fixed value: "pan" |
| `id_number` | string | `"BJSPG8612A"` | 10-character PAN number |
| `phone` | string | `"9988991300"` | 10-digit mobile number |
| `dob` | string | `"1990-05-15"` | ISO 8601 format (YYYY-MM-DD) |
| `state` | string | `"Maharashtra"` | Full state name |
| `address` | string | `"123 Main St"` | Residential address |
| `pincode` | string | `"400001"` | 6-digit postal code |
| `consent_text` | string | Fixed text | Consent declaration text |
| `consent.consentFlag` | boolean | `true` | Consent given by user |
| `consent.consentTimestamp` | string | `"2026-10-26T19:22:23.353Z"` | ISO 8601 timestamp |
| `consent.consentIpAddress` | string | `"192.168.1.100"` | IP address of consent |
| `consent.consentMessageId` | string | `"CM_1"` | Fixed identifier |

## Response Examples

### Success Response

```json
{
  "status": true,
  "txn_id": "PP4920327320",
  "txn_status": "success",
  "message": "Generate Equifax CCR Report",
  "data": {
    "bureauConsentId": "f507045f-b30d-430c-b62e-da0295879b61",
    "consent": true,
    "data": {
      "client_id": "credit_report_v2_dGIdNBEJeiQrjnlaYSxy",
      "pan": null,
      "id_number": "BJSPG8612A",
      "id_type": "pan",
      "mobile": "9988991300",
      "name": "Rahul Goyal",
      "credit_score": "494",
      "credit_report": {
        "InquiryResponseHeader": {
          "ClientID": "007FP16680",
          "CustRefField": "REF16271",
          "ReportOrderNO": "2368364731",
          "ProductCode": ["IDCR"],
          "SuccessCode": "1",
          "Date": "2026-01-12"
        }
      }
    }
  }
}
```

### Success Response - Key Fields

| Path | Type | Example | Description |
|------|------|---------|-------------|
| `status` | boolean | `true` | Success indicator |
| `txn_id` | string | `"PP4920327320"` | Unique transaction ID |
| `txn_status` | string | `"success"` | Transaction status |
| `message` | string | `"Generate Equifax CCR Report"` | Response message |
| `data.bureauConsentId` | string | UUID | Consent reference for audit trail |
| `data.data.credit_score` | string | `"494"` | Credit score value |
| `data.data.credit_report` | object | {...} | Complete credit report structure |

### Error Response - Invalid Token

```json
{
  "statuscode": "ERR",
  "status": false,
  "message": "Invalid Api token"
}
```

### Error Response - Bad Parameters

```json
{
  "statuscode": "BPR",
  "status": false,
  "message": "Bad Parameter Request"
}
```

## Integration Code Example

### TypeScript Usage

```typescript
import { fetchBureauReport, type Applicant } from './bureaus';

const applicant: Applicant = {
  fullName: "Rahul Goyal",
  pan: "BJSPG8612A",
  dateOfBirth: "1990-05-15",
  gender: "male",
  addressLine1: "123 Main Street, Building A",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  email: "rahul@example.com",
  mobile: "9988991300"
};

const result = await fetchBureauReport('equifax', applicant);

if (result.ok) {
  console.log('Report URL:', result.reportUrl);
  console.log('Transaction ID:', result.providerTxnId);
  console.log('Credit Score:', result.raw?.data?.data?.credit_score);
} else {
  console.error('Error:', result.message);
}
```

## State Codes Reference

Valid state values for `state` field:

| State Code | State / Union Territory | Pincode Range |
|------------|------------------------|---------------|
| AN | Andaman & Nicobar Islands | 744 |
| AP | Andhra Pradesh | 500-535 |
| AR | Arunachal Pradesh | 790-792 |
| AS | Assam | 781-788 |
| BR | Bihar | 800-855 |
| CG | Chhattisgarh | 490-497 |
| CH | Chandigarh | 160 |
| DD | Daman & Diu | 362, 396 |
| DL | Delhi | 110 |
| DN | Dadra & Nagar Haveli | 396 |
| GA | Goa | 403 |
| GJ | Gujarat | 360-396 |
| HP | Himachal Pradesh | 171-177 |
| HR | Haryana | 121-136 |
| JH | Jharkhand | 813-835 |
| JK | Jammu & Kashmir | 180-194 |
| KA | Karnataka | 560-591 |
| KL | Kerala | 670-695 |
| LD | Lakshadweep | 682 |
| MH | Maharashtra | 400-445 |
| ML | Meghalaya | 793-794 |
| MN | Manipur | 795 |
| MP | Madhya Pradesh | 450-488 |
| MZ | Mizoram | 796 |
| NL | Nagaland | 797-798 |
| OR | Odisha | 751-770 |
| PB | Punjab | 140-160 |
| PY | Puducherry | 533, 605, 607, 609 |
| RJ | Rajasthan | 301-345 |
| SK | Sikkim | 737 |
| TG | Telangana | 500-509 |
| TN | Tamil Nadu | 600-643 |
| TR | Tripura | 799 |
| UL | Uttarakhand | 244-263 |
| UP | Uttar Pradesh | 201-285 |
| WB | West Bengal | 700-743 |

## Validation Rules

### Name Field
- Required: Yes
- Format: Full name (first name + last name)
- Example: "Rahul Goyal" or "John Smith"

### PAN (id_number)
- Required: Yes
- Format: 10 characters (alphanumeric)
- Pattern: [A-Z]{5}[0-9]{4}[A-Z]
- Example: "BJSPG8612A"

### Phone (mobile)
- Required: Yes
- Format: 10-digit number
- Example: "9988991300"

### Date of Birth (dob)
- Required: Yes
- Format: YYYY-MM-DD (ISO 8601)
- Example: "1990-05-15"

### State
- Required: Yes
- Format: Full state name
- Must be valid Indian state/UT
- Example: "Maharashtra", "Delhi"

### Address (addressLine1)
- Required: Yes
- Format: Street address string
- Example: "123 Main Street, Building A"

### Pincode (pincode)
- Required: Yes
- Format: 6-digit number
- Pattern: \d{6}
- Example: "400001"

### Consent Timestamp
- Format: ISO 8601 with timezone
- Generated server-side
- Example: "2026-10-26T19:22:23.353Z"

### Consent IP Address
- Format: IPv4 address
- Default: "0.0.0.0" (if not captured)
- Example: "192.168.1.100"

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| ERR | Invalid API token | Verify token in environment variables |
| BPR | Bad Parameter Request | Check all required fields are provided |
| - | Empty response | Check API endpoint URL |
| - | Network timeout | Retry with longer timeout |

## Notes

1. **Token Security**: Keep the API token in environment variables (never hardcoded)
2. **Consent Timestamp**: Always use server time in ISO 8601 format
3. **IP Address**: Consider capturing the client's real IP instead of hardcoding
4. **Response Storage**: Save the `bureauConsentId` for compliance and audit trail
5. **Credit Score**: Typically ranges from 300-900
6. **Report URL**: Pre-signed S3 URL with 24-hour expiration
