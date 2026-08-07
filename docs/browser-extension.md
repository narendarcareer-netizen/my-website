# JobPilot browser-assisted applications

Phase 7 is a Chrome Manifest V3 extension in `extension/`. It assists with Greenhouse and Lever forms but contains no employer-form submission code. The employer's Submit button is always the only submission mechanism.

## Architecture and authentication

The signed-in JobPilot page creates a 15-minute opaque session through `/api/extension/session`. It verifies application ownership, `READY_TO_APPLY`, the employer URL, and approved documents. The web page passes the token directly to the installed extension through Chrome external messaging. It is never placed in an employer URL or page DOM. The extension stores it only in `chrome.storage.session`; closing the browser session clears it. Supabase service keys and Gemini keys remain server-only.

Extension requests use the opaque bearer token. The server stores only its SHA-256 hash and scopes every request to one user and application. Run `supabase/migrations/202608070006_browser_assist.sql` before using assisted mode.

## Build and install

```powershell
cd C:\Projects\my-website\extension
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `C:\Projects\my-website\extension\dist`. Copy the extension ID shown by Chrome into the root `.env.local`:

```env
NEXT_PUBLIC_JOBPILOT_EXTENSION_ID=the_id_from_chrome
```

Restart JobPilot after changing the environment file.

## Permissions

- `storage`: session-only opaque application session.
- `activeTab` and `scripting`: user-invoked generic review on the current page.
- Greenhouse and Lever host permissions: detect and assist only the two supported ATS families.
- Localhost API permissions: communicate with local JobPilot on ports 3000 or 3001.

The extension intentionally avoids `<all_urls>`, cookies, clipboard access, web-request interception, and permanent file URLs. Manifest V3 CSP permits only bundled local scripts and forbids `eval` and remote executable code.

## Field policy

High-confidence name, email, phone, location, LinkedIn, portfolio, approved resume, and approved cover-letter fields may be filled. Fill All Safe excludes unknown, low-confidence, generated, reusable-answer, and sensitive fields.

Race, ethnicity, sex, gender, disability, veteran status, religion, medical data, SSN, government ID, criminal history, and demographic surveys are always marked **Requires your input** and never filled. Work authorization, sponsorship, relocation, salary, start date, and remote preferences require individual review of a user-owned saved answer and confirmation that the employer wording has the same meaning.

Open-ended questions call a server-only Gemini endpoint grounded in the approved resume's verified facts and untrusted job data. The extension shows the suggestion in an editable prompt and requires explicit acceptance before filling.

## Documents

The short-lived session locks exact approved `document_versions`. PDF endpoints regenerate those exact versions privately and return them only for the active extension session. No public resume URL is created.

## ATS behavior

Greenhouse and Lever adapters use URL and DOM evidence, labels, ARIA labels, placeholders, nearby text, names, IDs, input types, and select options. A debounced MutationObserver rescans dynamic questions. Low ATS confidence disables Fill All. The generic adapter is available only after the user clicks the extension popup on the current tab, and it requires individual review.

CAPTCHA and employer login/MFA text trigger instructions to complete verification directly. The extension never attempts a bypass. A detected confirmation page only asks whether the user wants to mark the application submitted; the backend is called only after confirmation.

## Fixture testing

Serve the extension folder locally with any static server, then open `test-fixtures/greenhouse.html` or `test-fixtures/lever.html`. Click the extension icon and **Scan current page**. The fixtures include safe, sensitive, custom, upload, and employer Submit fields. Do not click Submit.

Automated tests verify Greenhouse/Lever detection, safe mapping, sensitive classification, low-confidence custom fields, and absence of `.submit()`, `requestSubmit()`, submit-button targeting, or programmatic clicks in content code.

## Audit events

The extension records only non-sensitive metadata for `ASSISTED_APPLICATION_OPENED`, `ATS_DETECTED`, `FORM_SCANNED`, `FIELD_FILLED`, `FIELD_SKIPPED`, `USER_ANSWER_REQUIRED`, `DOCUMENT_UPLOADED`, `FORM_READY_FOR_REVIEW`, and `ASSISTED_SESSION_ENDED`. Answer values, profile values, resume text, and tokens are never included in events or console logs.

## Real-form testing

Use a `READY_TO_APPLY` application and click **Open assisted application**. On Greenhouse or Lever, confirm ATS detection, inspect every suggestion, test Fill All Safe, verify sensitive and unknown fields remain empty, upload approved documents, and close the page without clicking the employer Submit button.
