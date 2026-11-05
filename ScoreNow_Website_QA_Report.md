# Scorenow Website QA Report

**Test date:** 5 November 2026  
**Target:** https://scorenow.in/ and https://api.scorenow.in/api/health  
**Test type:** Black-box functional, responsive, accessibility-smoke, and deployment checks  
**Environment:** Integrated Chromium browser on macOS; viewport widths 320, 360, 390, 768, 1024, and 1440 CSS pixels

## Executive Summary

The public website is available and the main landing, business, and score-estimator experiences worked in the tested browser. The API health endpoint returned HTTP 200. No broken images, uncaught browser errors, or horizontal overflow were observed across the tested widths.

Four issues were identified: keyboard focus is not moved into or contained by the login dialog; unauthenticated direct visits to `/dashboard` silently return to the homepage; unknown paths render the homepage with HTTP 200 instead of a not-found page; and small text in the illustrative mobile dashboard is difficult to read on a phone-sized viewport.

**Overall result: Pass with issues.** The findings below should be addressed before treating the website as fully accessible and resilient to direct-link navigation.

## Findings

### SN-WEB-01: Login dialog leaves keyboard focus behind the overlay

**Severity:** P2 – Major accessibility/usability issue  
**Status:** Reproduced

**Observed:** Opening the login dialog leaves focus on the “Log in or sign up” trigger outside the dialog. Pressing Tab moves focus to the underlying “Open navigation” button instead of the dialog's first control. The dialog is exposed as modal, so keyboard users can navigate controls behind the overlay.

**Reproduction:** Open the home page, activate “Log in or sign up”, then press Tab. Focus remains outside the dialog.

**Expected:** Move focus into the dialog on open, keep keyboard focus within it while open, and return focus to the trigger when closed. Escape and the visible Close button should both close it.

**Recommendation:** Implement modal focus entry, focus containment, and focus restoration; verify with keyboard-only testing and a screen reader.

### SN-WEB-02: Unauthenticated dashboard deep link silently returns to home

**Severity:** P2 – Major navigation issue  
**Status:** Reproduced

**Observed:** A direct visit to `/dashboard` returns HTTP 200 but the browser ends at `/` and displays the public homepage. There is no sign-in prompt or explanation, and the intended destination is not preserved.

**Reproduction:** Open `https://scorenow.in/dashboard` in a signed-out browser session.

**Expected:** Present a clear sign-in requirement and return the user to the dashboard after successful authentication, or show an explicit access-required state.

**Recommendation:** Preserve the requested destination through authentication and show a clear message instead of silently redirecting.

### SN-WEB-03: Unknown paths render the homepage with HTTP 200

**Severity:** P3 – Moderate routing/diagnostic issue  
**Status:** Reproduced

**Observed:** `https://scorenow.in/not-a-real-page` returns HTTP 200 and displays the homepage without indicating that the requested page does not exist.

**Expected:** Render a branded not-found page, provide a route back to a valid page, and return an appropriate not-found status where the hosting setup permits.

**Recommendation:** Add an explicit client-side catch-all not-found view and configure deployment fallback/status handling.

### SN-WEB-04: Illustrative dashboard microcopy is too small on mobile

**Severity:** P3 – Minor readability issue  
**Status:** Observed at 390px viewport

**Observed:** Text within the illustrative score dashboard was measured at approximately 7–11 CSS pixels, including labels and a “Last updated” line. This is substantially smaller than the surrounding page copy and is difficult to read on a phone.

**Expected:** Informational text in the mock dashboard should remain legible at phone size, or be clearly treated as decorative and non-essential.

**Recommendation:** Increase the mockup's smallest text where possible, or simplify/remove low-value labels on narrow screens. Recheck at 320–390px.

## Coverage and Results

| Area | Result | Evidence |
|---|---|---|
| Home page availability and page identity | Pass | HTTP 200; expected title and single primary heading |
| Business page availability and direct entry | Pass | `/business` loaded with expected title, heading, content, and form |
| Dashboard unauthenticated direct entry | Fail | Redirected to `/` without sign-in explanation; SN-WEB-02 |
| Unknown URL handling | Fail | Unknown route showed homepage with HTTP 200; SN-WEB-03 |
| API availability | Pass | `/api/health` returned `{"status":"ok","service":"Score Now API"}` with HTTP 200 |
| Browser runtime and first-party assets | Pass | No uncaught page errors, broken images, or failed first-party requests observed in the initial load |
| Responsive layout | Pass | No horizontal overflow at 320, 360, 390, 768, 1024, or 1440px |
| Mobile navigation | Pass | Menu opened and business link navigated successfully |
| In-page navigation | Pass | All checked hash links resolved to page elements |
| Login dialog controls | Partial | Opens; email tab exposes required email/password fields; Escape and Close worked in checks. Keyboard focus handling failed; SN-WEB-01 |
| Business assessment validation | Pass (client-side only) | Empty form is invalid; required name, contact, and business-type fields are enforced |
| Score estimator | Pass | Completed all six questions, displayed an indicative range, and restart returned to the first question |
| Mobile dashboard mockup readability | Needs improvement | Smallest observed labels measured approximately 7–11px; SN-WEB-04 |
| Security response headers | Review recommended | Tested page/API responses did not expose CSP, HSTS, X-Content-Type-Options, or frame protection headers |

## Security and Privacy Smoke Check

Only non-invasive public checks were performed. The public API health endpoint was reachable. The tested HTML and health responses did not expose common browser security headers (Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, or frame protection). This is a hardening recommendation, not evidence that an exploitable vulnerability exists; confirm edge/CDN configuration and assess compatibility before rollout.

No vulnerability scanning, authentication bypass attempts, payment actions, report retrieval, or submission of personal or financial data was performed.

## Not Tested

- Account creation, OTP delivery, password authentication, and authenticated dashboard data
- Paid report purchase, payment verification/refunds, bureau integrations, and PDF downloads
- Assessment submission, file-upload boundaries, database persistence, and email delivery
- Cross-browser behavior beyond the integrated Chromium session
- Full WCAG audit, screen-reader testing, automated accessibility scanning, and keyboard testing beyond the login dialog smoke check
- Load, stress, penetration, and API authorization testing

These flows require test credentials, controlled test data, or safe payment/bureau sandbox accounts. Avoid using real customer information in follow-up testing.

## Recommended Retest Order

1. Fix and retest login dialog focus entry, containment, and restoration.
2. Retest signed-out `/dashboard` entry and post-login destination preservation.
3. Add and verify an explicit not-found route.
4. Improve mobile mockup text legibility and check at 320px and 390px.
5. Review security headers at the CDN/hosting layer, then run authenticated flows with dedicated test accounts and sandbox integrations.
