# ReceiptSnap — Setup Guide

One-time setup, roughly 20 minutes total. Do Part A on a desktop browser. You need to be signed in as a user with admin rights in the Aparobot Microsoft 365 tenant.

---

## Part A — Register the app in Entra (Aparobot tenant)

1. Go to https://entra.microsoft.com and sign in with your Aparobot admin account.

2. In the left menu open **Identity > Applications > App registrations**, then click **New registration**.

3. Fill in:
   - **Name:** `ReceiptSnap`
   - **Supported account types:** *Accounts in this organizational directory only (Single tenant)*
   - **Redirect URI:** choose platform **Single-page application (SPA)** and enter your hosting URL, e.g. `https://YOURUSERNAME.github.io/receiptsnap/`
     - The URI must match where the app is hosted **exactly**, including the trailing slash. If you are unsure yet, you can add or fix this later under **Authentication**.

4. Click **Register**.

5. On the app's **Overview** page, copy these two values — you will paste them into the app's Settings tab later:
   - **Application (client) ID**
   - **Directory (tenant) ID**

6. Open **API permissions** (left menu of the app registration):
   - You should already see `User.Read` (Microsoft Graph, Delegated).
   - Click **Add a permission > Microsoft Graph > Delegated permissions**, search for and tick **Files.ReadWrite**, then click **Add permissions**.
   - Click **Grant admin consent for [Aparobot]** and confirm. This removes the consent prompt at first sign-in. If the button is greyed out, your account lacks admin rights in the tenant.

7. Open **Authentication** (left menu) and verify:
   - Your redirect URI is listed under **Single-page application**. If it accidentally landed under "Web", remove it there and re-add it under SPA — MSAL browser auth will not work otherwise.
   - Nothing else needs enabling. Do **not** enable implicit grant.

That is the whole registration. No client secret is needed (SPA uses the PKCE flow, which is the point — no secret ever sits in the app's code).

---

## Part B — Host the app

Same approach as CardSnap. All five files must sit together at the same path:

```
index.html
sw.js
manifest.webmanifest
icon-192.png
icon-512.png
```

**GitHub Pages (recommended):**

1. Create a repo (e.g. `receiptsnap`), upload the five files to the repo root.
2. Repo **Settings > Pages > Source:** deploy from branch `main`, folder `/ (root)`.
3. Your URL becomes `https://YOURUSERNAME.github.io/receiptsnap/`. Confirm this exact URL (with trailing slash) is the SPA redirect URI in Part A step 3/7.

HTTPS is mandatory — MSAL, the camera, and the service worker all require it. GitHub Pages provides it automatically.

---

## Part C — First run on your phone

1. Open the hosted URL in Chrome on your Android phone.

2. Go to **Settings** tab in the app:
   - Paste the **Application (client) ID** and **Directory (tenant) ID** from Part A step 5.
   - Tap **Sign in with Microsoft 365** and sign in with your `@aparobot.com` account. You will be redirected to Microsoft and back.
   - Paste your **Anthropic API key** (starts with `sk-ant-`). It stays on the device.
   - Leave the base folder as `/Receipts` unless you want a different location. Change it only before your first batch — moving it later orphans your history.

3. Tap **Check storage setup**. The app creates `/Receipts/Claims.xlsx` in your OneDrive with the Claims table pre-built, and confirms everything is reachable. You should see "Ready to file."

4. Install as an app: Chrome menu (⋮) > **Add to Home screen** > **Install**.

5. Scan a real receipt, confirm it, submit, then open Claims.xlsx in Excel or OneDrive to verify the row and the PDF link.

---

## How the pieces behave (worth knowing)

- **The Excel file is the source of truth.** The History tab and the "Filed this month" chart are read from the Claims table, not from the phone. You can add your own columns to the right of the table (e.g. "Claimed?") — the app only ever appends rows to the six defined columns and never edits existing rows.
- **Do not rename the table.** The table inside Claims.xlsx is named `Claims`. If you replace the file manually, the new file must contain a table with that exact name or appends will fail (the app will tell you).
- **Dates are stored as text** (`2026-07-19`) so they can never be mangled by regional settings. If you want Excel date arithmetic, add a helper column with `=DATEVALUE([@Date])`.
- **File conflicts:** if Claims.xlsx is open for editing at the moment a row is appended, Graph occasionally returns a lock error. The app retries automatically with backoff (4 attempts). If it still fails, the receipt stays in your tray and you just submit again — nothing is half-written.
- **PDF size:** photos are downscaled to max 2000 px and compressed before the PDF is built, so files are typically 300–800 KB. Larger files fall back to chunked upload automatically.
- **Token expiry:** MSAL refreshes tokens silently. Roughly every 90 days of inactivity you may be bounced to the Microsoft sign-in page once — that is normal.

## Troubleshooting

- **"AADSTS50011: redirect URI mismatch"** — the hosted URL and the SPA redirect URI in Entra are not identical. Check trailing slash and http vs https.
- **Sign-in works but uploads fail with 403** — `Files.ReadWrite` permission missing or admin consent not granted (Part A step 6).
- **"table Claims was not found"** — someone replaced or renamed the workbook/table. Restore it, or move the old file away and tap **Check storage setup** to regenerate a fresh one (history starts empty in that case).
- **Camera does not open** — the page must be served over HTTPS and Chrome needs camera permission for the site.
