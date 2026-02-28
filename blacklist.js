function getBlacklistFromSheet() {
  // open the sheet and check if not empty
  var ss = openBlacklist_();
  if (!ss) return emptyBlacklist_();

  var tab = PropertiesService.getScriptProperties().getProperty("BLACKLIST_TAB_NAME") || "blacklist";
  var sh = ss.getSheetByName(tab);
  if (!sh) return emptyBlacklist_();

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return emptyBlacklist_();

  // arrays for each column
  var emails = [];
  var senderDomains = [];
  var exactUrls = [];
  var urlDomains = [];

  // iterate over each row to save the value in the relevant variable
  for (var r = 1; r < values.length; r++) {
    var row = values[r] || [];

    var a = String(row[0] || "").trim().toLowerCase(); // exact sender email
    var b = String(row[1] || "").trim().toLowerCase(); // sender domain
    var c = String(row[2] || "").trim();               // exact URL
    var d = String(row[3] || "").trim().toLowerCase(); // URL domain

    if (a) emails.push(a);
    if (b) senderDomains.push(b);
    if (c) exactUrls.push(normalizeUrl_(c));
    if (d) urlDomains.push(d);
  }

  return {
    emails: dedupe_(emails),
    senderDomains: dedupe_(senderDomains),
    exactUrls: dedupe_(exactUrls),
    urlDomains: dedupe_(urlDomains)
  };
}

function addToBlacklistSheet(input) {
  // if the input is empty, return an error object and abort
  input = String(input || "").trim();
  if (!input) return { ok: false, msg: "Empty input" };

  var ss = openBlacklist_();
  if (!ss) return { ok: false, msg: "Missing BLACKLIST_SHEET_ID" };

  var tab = PropertiesService.getScriptProperties().getProperty("BLACKLIST_TAB_NAME") || "blacklist";
  var sh = ss.getSheetByName(tab);
  if (!sh) return { ok: false, msg: "Tab not found: " + tab };

  var now = new Date();

  // columns: A exact sender email | B sender domain | C exact URL | D URL domain | E added_at
  var row = ["", "", "", "", now];

  if (looksLikeUrl_(input)) {
    var u = normalizeUrl_(input);
    row[2] = u;
    row[3] = getHost_(u);
    sh.appendRow(row);
    return { ok: true, msg: "Added URL + domain" };
  }

  if (looksLikeEmail_(input)) {
    var em = input.toLowerCase();
    row[0] = em;
    row[1] = (em.split("@")[1] || "").toLowerCase();
    sh.appendRow(row);
    return { ok: true, msg: "Added email + domain" };
  }

  // fallback: If it doesn't look like a url or an email, assume the user inputted a raw domain name
  row[1] = input.toLowerCase().replace(/^@/, "");
  sh.appendRow(row);
  return { ok: true, msg: "Added sender domain" };
}

function deleteFromBlacklistSheet(input) {
  input = String(input || "").trim();
  if (!input) return { ok: false, msg: "Empty input" };

  var ss = openBlacklist_();
  if (!ss) return { ok: false, msg: "Missing BLACKLIST_SHEET_ID" };

  var tab = PropertiesService.getScriptProperties().getProperty("BLACKLIST_TAB_NAME") || "blacklist";
  var sh = ss.getSheetByName(tab);
  if (!sh) return { ok: false, msg: "Tab not found: " + tab };

  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: false, msg: "Blacklist is empty" };

  var t = input.toLowerCase();
  var tUrl = looksLikeUrl_(input) ? normalizeUrl_(input).toLowerCase() : "";

  var removed = 0;

  for (var r = values.length - 1; r >= 1; r--) {
    var row = values[r] || [];

    var a = String(row[0] || "").trim().toLowerCase();
    var b = String(row[1] || "").trim().toLowerCase();
    var c = String(row[2] || "").trim();
    var cNorm = c ? normalizeUrl_(c).toLowerCase() : "";
    var d = String(row[3] || "").trim().toLowerCase();

    // check if the input matches any of the columns in this row
    var match =
      (a && a === t) ||
      (b && b === t) ||
      (d && d === t) ||
      (tUrl && cNorm === tUrl);

    if (match) {
      // +1 because spreadsheet rows are 1-indexed, but arrays are 0-indexed
      sh.deleteRow(r + 1);
      removed++;
    }
  }

  return { ok: true, msg: removed ? ("Deleted " + removed + " row(s)") : "No match found" };
}

// helper to open the blacklist and handle errors
function openBlacklist_() {
  var id = PropertiesService.getScriptProperties().getProperty("BLACKLIST_SHEET_ID");
  if (!id) return null;
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    Logger.log("openBlacklist_ error: " + e);
    return null;
  }
}

// helper to return an empty blacklist object format if the sheet fails to load
function emptyBlacklist_() {
  return { emails: [], senderDomains: [], exactUrls: [], urlDomains: [] };
}

// helper to remove duplicate entries from the arrays
function dedupe_(arr) {
  var out = [];
  var seen = {};
  for (var i = 0; i < (arr || []).length; i++) {
    var v = String(arr[i] || "").trim();
    if (!v) continue;
    if (!seen[v]) { seen[v] = true; out.push(v); }
  }
  return out;
}

// helper to identify a url
function looksLikeUrl_(s) {
  return /^https?:\/\//i.test(String(s || "").trim());
}
// helper to identify an email
function looksLikeEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}