export const BUREAUS = ["cibil", "equifax", "experian", "crif"];
export const bureauNames = {
    cibil: "TransUnion CIBIL",
    equifax: "Equifax",
    experian: "Experian",
    crif: "CRIF",
};
export const isBureau = (value) => typeof value === "string" && BUREAUS.includes(value);
const payprimeToken = () => process.env.PAYPRIME_API_TOKEN || process.env.CIBIL_API_TOKEN;
const providerConfig = (bureau) => {
    if (bureau === "cibil") {
        return { url: process.env.CIBIL_API_URL || "https://b2b.payprime.in/api/cibil-report", token: process.env.CIBIL_API_TOKEN || payprimeToken() };
    }
    if (bureau === "equifax") {
        return { url: process.env.EQUIFAX_API_URL || "https://b2b.payprime.in/api/equifax-ccr", token: process.env.EQUIFAX_API_TOKEN || payprimeToken() };
    }
    if (bureau === "experian") {
        return { url: process.env.EXPERIAN_API_URL || "https://b2b.payprime.in/api/experian-report", token: process.env.EXPERIAN_API_TOKEN || payprimeToken() };
    }
    return { url: process.env.CRIF_API_URL || "https://b2b.payprime.in/api/crif-report", token: process.env.CRIF_API_TOKEN || payprimeToken() };
};
export const isBureauAvailable = (bureau) => {
    const { url, token } = providerConfig(bureau);
    return Boolean(url && token);
};
// TransUnion CIBIL state codes used in the `region` field.
export const stateCodes = {
    "Jammu and Kashmir": "01",
    "Himachal Pradesh": "02",
    "Punjab": "03",
    "Chandigarh": "04",
    "Uttarakhand": "05",
    "Haryana": "06",
    "Delhi": "07",
    "Rajasthan": "08",
    "Uttar Pradesh": "09",
    "Bihar": "10",
    "Sikkim": "11",
    "Arunachal Pradesh": "12",
    "Nagaland": "13",
    "Manipur": "14",
    "Mizoram": "15",
    "Tripura": "16",
    "Meghalaya": "17",
    "Assam": "18",
    "West Bengal": "19",
    "Jharkhand": "20",
    "Odisha": "21",
    "Chhattisgarh": "22",
    "Madhya Pradesh": "23",
    "Gujarat": "24",
    "Daman and Diu": "25",
    "Dadra and Nagar Haveli": "26",
    "Maharashtra": "27",
    "Andhra Pradesh": "28",
    "Karnataka": "29",
    "Goa": "30",
    "Lakshadweep": "31",
    "Kerala": "32",
    "Tamil Nadu": "33",
    "Puducherry": "34",
    "Andaman and Nicobar Islands": "35",
    "Telangana": "36",
    "Ladakh": "38",
};
// Equifax and CIBIL need address, email, DOB; Experian only needs name, PAN and mobile.
export const missingApplicantFields = (bureau, applicant) => {
    const missing = [];
    if (bureau === "experian" || bureau === "crif")
        return missing;
    if (!applicant.addressLine1)
        missing.push("address");
    if (!applicant.city)
        missing.push("city");
    if (!applicant.state)
        missing.push("state");
    if (!applicant.pincode || !/^\d{6}$/.test(applicant.pincode))
        missing.push("PIN code");
    if (!applicant.dateOfBirth)
        missing.push("date of birth");
    if (bureau === "cibil") {
        if (!applicant.email)
            missing.push("email");
        if (applicant.gender !== "male" && applicant.gender !== "female")
            missing.push("gender (male/female)");
    }
    return missing;
};
export const scoreBand = (score) => {
    if (score === null)
        return null;
    if (score >= 750)
        return "Excellent";
    if (score >= 700)
        return "Good";
    if (score >= 650)
        return "Fair";
    return "Needs attention";
};
const MAX_PDF_BYTES = 20 * 1024 * 1024;
// The bureau PDF is a pre-signed S3 link that expires (24h), so it must be stored on completion.
export const livePdfUrl = (raw) => {
    const data = raw?.data?.data;
    if (!data)
        return null;
    // Try different field names used by different bureaus
    const pdfUrl = data?.pdf_report_url || data?.htmlUrl;
    if (typeof pdfUrl !== "string")
        return null;
    try {
        const url = new URL(pdfUrl);
        const signedAt = url.searchParams.get("X-Amz-Date");
        const expiresIn = Number(url.searchParams.get("X-Amz-Expires"));
        if (signedAt && expiresIn) {
            const iso = signedAt.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z");
            if (Date.parse(iso) + expiresIn * 1000 < Date.now())
                return null;
        }
        return pdfUrl;
    }
    catch {
        return null;
    }
};
export const downloadReportPdf = async (url) => {
    if (!url)
        return null;
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !/\.amazonaws\.com$/i.test(parsed.hostname))
        return null;
    try {
        const response = await fetch(parsed, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || Number(response.headers.get("content-length")) > MAX_PDF_BYTES)
            return null;
        const pdf = Buffer.from(await response.arrayBuffer());
        if (pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString("latin1") !== "%PDF-")
            return null;
        return pdf;
    }
    catch (error) {
        console.error("Report PDF download failed", error);
        return null;
    }
};
const buildPayload = (bureau, token, applicant, consentIpAddress) => {
    const nameParts = applicant.fullName.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    if (bureau === "equifax") {
        const consentTimestamp = new Date().toISOString();
        return {
            token,
            name: applicant.fullName,
            id_type: "pan",
            id_number: applicant.pan,
            phone: applicant.mobile,
            dob: applicant.dateOfBirth,
            state: applicant.state,
            address: applicant.addressLine1,
            pincode: applicant.pincode,
            consent_text: "I approve TransBnk to capture and process user data based on user consent",
            consent: {
                consentFlag: true,
                consentTimestamp,
                consentIpAddress,
                consentMessageId: "CM_1",
            },
        };
    }
    if (bureau === "experian") {
        return { token, first_name: firstName, last_name: lastName, pan: applicant.pan, phone: applicant.mobile, consent: "Y" };
    }
    if (bureau === "crif") {
        return {
            token,
            first_name: firstName,
            last_name: lastName,
            phone: applicant.mobile,
            consent: true,
        };
    }
    return {
        token,
        first_name: firstName,
        last_name: lastName,
        id_type: "TaxId",
        id_number: applicant.pan,
        street_address: applicant.addressLine1,
        city: applicant.city,
        postal_code: Number(applicant.pincode),
        region: stateCodes[applicant.state || ""],
        address_type: 1,
        email: applicant.email,
        phone: Number(applicant.mobile),
        dob: applicant.dateOfBirth,
        gender: applicant.gender === "female" ? "Female" : "Male",
        legal_copy_status: "Accept",
        user_consent_data_share: true,
    };
};
export const fetchBureauReport = async (bureau, applicant, consentIpAddress) => {
    const { url, token } = providerConfig(bureau);
    if (!url || !token)
        return { ok: false, message: `${bureauNames[bureau]} API is not configured.`, raw: null, diagnostics: null };
    const payload = buildPayload(bureau, token, applicant, consentIpAddress);
    console.log(`[${bureau.toUpperCase()}] Sending payload to ${url}`, {
        hasToken: 'token' in payload && !!payload.token,
        keys: Object.keys(payload),
    });
    const diagnostics = {
        request: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "token")),
        response: { httpStatus: null, body: null },
    };
    let response;
    try {
        const jsonBody = JSON.stringify(payload);
        // Verify token was actually serialized into the JSON
        if (!jsonBody.includes('"token"')) {
            throw new Error("Token field missing from request payload");
        }
        console.log(`[${bureau.toUpperCase()}] Sending request to ${url}, payload size: ${jsonBody.length} bytes`);
        response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonBody,
            signal: AbortSignal.timeout(90000),
        });
    }
    catch (error) {
        console.error(`${bureau} report request failed`, error);
        diagnostics.response.body = { message: `Unable to reach the ${bureauNames[bureau]} report provider.` };
        return { ok: false, message: `Unable to reach the ${bureauNames[bureau]} report provider.`, raw: null, diagnostics };
    }
    const body = await response.json().catch(() => null);
    const safeResponseBody = body && Object.fromEntries(["status", "statuscode", "txn_id", "txn_status", "message", "error", "error_code"]
        .filter((key) => key in body)
        .map((key) => [key, body[key]]));
    diagnostics.response = { httpStatus: response.status, body: safeResponseBody ?? null };
    // Payprime errors come back as HTTP 200 with `status` set to an error string, so only `status: true` counts as success.
    if (!response.ok || !body || body.status !== true || (body.txn_status && body.txn_status !== "success")) {
        return { ok: false, message: body?.message || `The ${bureauNames[bureau]} provider could not generate your report.`, raw: body, diagnostics };
    }
    return {
        ok: true,
        providerTxnId: body.txn_id ?? null,
        reportUrl: body.data?.data?.htmlUrl ?? null,
        raw: body,
        diagnostics,
    };
};
