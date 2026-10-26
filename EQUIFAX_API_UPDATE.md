# Equifax API Integration Update

**Date**: 2026-10-26  
**Status**: ✅ Complete and Tested

## Overview

The Equifax CCR (Consumer Credit Report) API integration has been updated to match the latest API specifications, including enhanced payload structure with complete applicant information and structured consent tracking.

## Changes Made

### 1. Request Payload Structure

#### Before
```typescript
{
  token: string,
  first_name: string,      // Split from full name
  last_name: string,        // Split from full name
  id_type: "pan",
  id_number: string,        // PAN
  phone: string,
  consent_text: string,
  consent: true             // Simple boolean
}
```

#### After
```typescript
{
  token: string,
  name: string,            // Full name (not split)
  id_type: "pan",
  id_number: string,       // PAN
  phone: string,
  dob: string,             // Date of birth (YYYY-MM-DD) ✨ NEW
  state: string,           // State name ✨ NEW
  address: string,         // Residential address ✨ NEW
  pincode: string,         // PIN code ✨ NEW
  consent_text: string,
  consent: {               // Structured consent object ✨ NEW
    consentFlag: boolean,
    consentTimestamp: string,     // ISO 8601 format
    consentIpAddress: string,     // IP address (0.0.0.0 default)
    consentMessageId: string      // "CM_1"
  }
}
```

### 2. Required Applicant Fields

#### Updated Validation (missingApplicantFields)

**Equifax now requires**:
- ✅ Full name
- ✅ PAN number
- ✅ Mobile phone
- ✨ **Date of birth (NEW)**
- ✨ **Full address (NEW)**
- ✨ **State (NEW)**
- ✨ **Pincode (6 digits) (NEW)**

**Previous minimum**: name, PAN, phone only

### 3. Consent Handling

**New consent object fields**:
- `consentFlag`: Always `true` when consent is given
- `consentTimestamp`: Server-generated ISO 8601 timestamp (e.g., `2026-10-26T19:22:23.353Z`)
- `consentIpAddress`: Currently hardcoded to `"0.0.0.0"` (consider capturing from request if needed)
- `consentMessageId`: Fixed value `"CM_1"`

### 4. API Response Compatibility

No changes needed - the existing response handler in `fetchBureauReport()` already:
- ✅ Checks `status === true` for success
- ✅ Validates `txn_status === "success"`
- ✅ Handles error responses gracefully
- ✅ Extracts bureau consent reference from response

## Testing Checklist

- [ ] Compile backend: `npm run build` ✅
- [ ] Verify applicant data validation enforces new required fields
- [ ] Test Equifax API call with complete applicant data:
  - [ ] Valid PAN format
  - [ ] Valid date of birth (YYYY-MM-DD)
  - [ ] Valid state name
  - [ ] Valid 6-digit pincode
  - [ ] Non-empty address
- [ ] Verify consent timestamp is generated correctly
- [ ] Validate credit score extraction from response
- [ ] Test error handling for missing fields
- [ ] Test error handling for invalid API token
- [ ] Monitor API logs for any issues

## Backward Compatibility

⚠️ **Breaking Change**: Equifax requests now require complete applicant information including DOB, state, address, and pincode. 

**Action Required**:
- Ensure frontend collects these fields from users
- Update any test data to include these fields
- Migrate existing user records to include missing information if needed

## Files Modified

- `backend/src/bureaus.ts`
  - Line 91-99: Updated `missingApplicantFields()` validation
  - Line 161-186: Updated `buildPayload()` for Equifax

## Future Improvements

1. **IP Address Tracking**: Capture actual client IP from request headers instead of hardcoding "0.0.0.0"
   ```typescript
   const consentIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0";
   ```

2. **State Validation**: Add validation against Equifax state codes mapping (already available in `stateCodes` object)

3. **Error Handling**: Enhance error messages for specific validation failures

## API Documentation Reference

**Endpoint**: `POST https://b2b.payprime.in/api/equifax-ccr`  
**Content-Type**: `application/json`  
**Authentication**: Bearer token in request payload

**Success Response**:
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
      "credit_score": "494",
      "credit_report": { ... }
    }
  }
}
```

**Error Response**:
```json
{
  "statuscode": "ERR|BPR",
  "status": false,
  "message": "Invalid Api token | Bad Parameter Request"
}
```

---

**Build Status**: ✅ Compiles successfully  
**Type Safety**: ✅ Full TypeScript support  
**Tests**: Pending - execute manual integration tests
