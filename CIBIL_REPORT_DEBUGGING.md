# CIBIL Report Issue - Debugging Guide

## Problem Summary

CIBIL report PDFs are being downloaded with empty sections - the PDF structure is complete (all headings present) but the data is missing:
- No account details (all fields show dashes or -1)
- No payment history
- No enquiry details
- Score and personal information render correctly

## Findings

### PDF Analysis (from downloaded PDF)
- **File**: `ScoreNow-cibil-report-2026-11-01_261101_203930_2536.pdf`
- **Pages**: 2 (complete document, not truncated)
- **Issue**: One account shown with "Active" status but NO details
- **Sections with data**: Consumer Details, Credit Score
- **Sections missing data**: Score Factors, Credit Summary, Accounts, Payment History, Enquiries

### JSON API Response
- The `/api/reports/:requestId` endpoint returns complete normalized report data
- This suggests data IS in the database but might not be reaching PDF generation

### Potential Root Causes

1. **CIBIL API Response Format Changed**
   - Location: `backend/src/reportParser.ts` (parseCibil function)
   - The parser looks for accounts in `report.TradeLinePartition` and enquiries in `report.InquiryPartition`
   - If CIBIL API changed the response structure, these paths might not match
   - **Evidence**: Parser shows 0 accounts/enquiries being extracted

2. **Database Data Truncation**
   - JSONB columns in PostgreSQL store the full data
   - Check if `normalized_report` JSON is being truncated or malformed

3. **PDF Generation from Old Parser Version**
   - If `PARSER_VERSION` changed, old reports might need re-parsing
   - Current version is 5

## How to Debug

### Step 1: Check Backend Logs
When downloading a CIBIL report, look for these log messages:

```
[CIBIL] Sending payload to...
Report normalized for cibil: { score:..., accountsCount:..., enquiriesCount:... }
PDF generation for [requestId]: { accountsCount:..., enquiriesCount:... }
CIBIL parser: TradeLinePartition or InquiryPartition is undefined
```

**What each log tells us:**
- `accountsCount: 0` → Parser isn't finding accounts
- `enquiriesCount: 0` → Parser isn't finding enquiries  
- "TradeLinePartition is undefined" → Response structure doesn't match expected format

### Step 2: Check the Raw CIBIL Response
The parser now logs the report keys. Check if the expected keys are present:
- Should see: `TradeLinePartition`, `InquiryPartition`
- If not found, CIBIL changed their response format

### Step 3: Manual Testing
1. Go to Reports page
2. Download a CIBIL report
3. Check backend logs (console output or logs file)
4. Compare expected keys vs actual keys in response

## Code Locations

- **Parser**: `backend/src/reportParser.ts` lines 333-400 (`parseCibil` function)
- **Logging**: `backend/src/server.ts` lines 920-950 (report fetching)
- **PDF Generation**: `backend/src/reportPdf.ts` lines 355-405 (accounts rendering)
- **Database**: `backend/src/database.ts` lines 1313-1350 (`getReportPdf` function)

## Next Steps

1. **Capture logs** from next CIBIL report download
2. **Share the logs** showing:
   - `Report normalized for cibil` counts
   - `PDF generation` counts  
   - Any warnings about missing TradeLinePartition/InquiryPartition
3. **If 0 accounts/enquiries found**:
   - Need to update parseCibil() with correct field names from new CIBIL API format
4. **If accounts found but details empty**:
   - Might be data coming back as -1 (unreported) from CIBIL - need to adjust display

## Potential Fixes

### If CIBIL API format changed:
The fallback paths added in reportParser.ts should help:
```typescript
// Tries multiple paths including case variations and nested structures
let tradeLinePartition = get(report, "TradeLinePartition") ?? 
  get(report, "Tradeline") ?? 
  get(data, "credit_report.Tradeline") ?? 
  get(data, "credit_report.accounts");
```

### If data values are all -1:
The `reported()` function filters these out. This is correct behavior - we should show "Not reported" instead.

### If database has empty data:
Need to check if the initial normalization stored empty arrays. The raw response should be in the database and can be re-parsed if needed.

## Testing the Fix

After identifying the issue and making changes:

1. Rebuild: `npm --prefix backend run build`
2. Download a test CIBIL report  
3. Verify accounts and enquiries appear in PDF
4. Check both the JSON API response AND the PDF match

---

**Contact**: If you encounter this issue, please capture:
- Backend console logs from report download
- The downloaded PDF
- Your mobile number (for potential CIBIL API debugging)
