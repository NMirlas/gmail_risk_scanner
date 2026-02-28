# Email Risk Scanner (Gmail Add-on)

A Gmail add-on that analyzes incoming emails and flags potential phishing attempts using deterministic rules, Google Safe Browsing, and a user-managed blacklist.

Built with Google Apps Script.

---

## Overview

When an email is opened in Gmail, the add-on:

1. Extracts sender, subject, body, and URLs  
2. Evaluates URLs using Google Safe Browsing  
3. Applies heuristic risk rules on email content  
4. Checks sender and URLs against a user-managed blacklist  
5. Uses caching to reduce repeated Safe Browsing calls  
6. Presents a risk score with explanations in the sidebar  

---

## Detection Logic

### Hard Rules (Immediate High Risk)

The email is marked **High Risk (score = 100)** if any of the following occur:

- Google Safe Browsing flags a URL  
- Sender email appears in blacklist  
- Sender domain appears in blacklist  
- Exact URL appears in blacklist  
- URL domain appears in blacklist  

---

### Heuristic Rules

If no hard rule triggers, the system applies additive scoring:

- URLs present in email  
- Urgent / pressure language detected  
- Invoice / payment language detected  
- Shortened URL detected  
- Safe Browsing request failure (minor penalty)  

Score is capped to **0–100**.

---

## Risk Levels

- **0–39 → Low**  
- **40–69 → Medium**  
- **70–100 → High**

---

## Project Structure

- `appsscript.json`
- `code.gs` — entry point
- `extract.gs` — email and URL extraction
- `analyze.gs` — scoring engine
- `safe_browse.gs` — Safe Browsing integration
- `cache.gs` — CacheService wrapper
- `blacklist.gs` — Google Sheets integration
- `ui.gs` — Gmail sidebar UI
---

## Prerequisites

### Enable Advanced Services (Apps Script)

Add:

- Gmail API  
- Sheets API  

---

### Enable APIs (Google Cloud)

Enable:

- Gmail API  
- Safe Browsing API  

---

## Script Properties

In **Project Settings → Script Properties**, configure:

SAFE_BROWSING_API_KEY = <your_key>
BLACKLIST_SHEET_ID    = <your_sheet_id>
BLACKLIST_TAB_NAME    = blacklist

---

## Blacklist Google Sheet

Create a Google Sheet with the following header row:

exact sender email | sender domain | exact URL | URL domain | added_at

The add-on automatically reads and updates this sheet.

---

## How to Run

1. Deploy the project as a Gmail Add-on  
2. Open Gmail  
3. Open any email  
4. View the **Email Risk Scanner** panel on the right  