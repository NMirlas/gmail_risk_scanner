function analyzeEmail(email) {
  var subject = (email && email.subject) ? String(email.subject) : "";
  var from = (email && email.from) ? String(email.from) : "";
  var urls = (email && email.urls) ? email.urls : [];

  // one blob of email content subject + plain + htmlText
  var plain = (email && email.plain) ? String(email.plain) : "";
  var html = (email && email.html) ? String(email.html) : "";
  var htmlText = stripHtml_(html);
  var blob = (subject + "\n" + plain + "\n" + htmlText).toLowerCase();

  // Blacklist
  var bl = getBlacklistFromSheet();

  // cached safe browsing results
  var sb = safeBrowsingCheckUrlsCached(urls);
  // if the url cached as "1" (malicious) than return immediately high risk
  if (sb.ok && (sb.matches || []).length > 0) {
    return {
      risk: "High",
      score: 100,
      reasons: ["Safe Browsing flagged a URL"],
      urls: urls,
      sb: sb,
      blacklist: bl
    };
  }

  // if the sender blacklisted => instant 100 (simple + strong)
  var senderEmail = getSenderEmail_(from);
  var senderDomain = senderEmail ? senderEmail.split("@")[1] : "";

  if (senderEmail && bl.emails.indexOf(senderEmail) !== -1) {
    return instantHigh_("Sender email is blacklisted: " + senderEmail, urls, sb, bl);
  }
  if (senderDomain && bl.senderDomains.indexOf(senderDomain) !== -1) {
    return instantHigh_("Sender domain is blacklisted: " + senderDomain, urls, sb, bl);
  }
  // if the url blacklisted => instant 100 (simple + strong)
  for (var i = 0; i < urls.length; i++) {
    var nu = normalizeUrl_(urls[i]);
    var host = getHost_(urls[i]);

    if (nu && bl.exactUrls.indexOf(nu) !== -1) {
      return instantHigh_("Exact URL is blacklisted: " + nu, urls, sb, bl);
    }
    if (host && bl.urlDomains.indexOf(host) !== -1) {
      return instantHigh_("URL domain is blacklisted: " + host, urls, sb, bl);
    }
  }

  // heuristic weights - rule based
  var score = 0;
  var reasons = [];

  if (urls.length > 0) { score += 20; reasons.push("URLs found"); }
  else { reasons.push("No URLs found"); }

  if (hasShortenerUrl_(urls)) { score += 15; reasons.push("Shortened link"); }
  if (containsUrgentWords_(blob)) { score += 25; reasons.push("Urgent / pressure language"); }
  if (containsInvoiceWords_(blob)) { score += 25; reasons.push("Invoice/payment language"); }

  if (urls.length > 0 && !sb.ok) { score += 15; reasons.push("Safe Browsing error"); }

  if (score > 100) score = 100;

  var risk = "Low";
  if (score >= 70) risk = "High";
  else if (score >= 40) risk = "Medium";

  return {
    risk: risk,
    score: score,
    reasons: reasons,
    urls: urls,
    sb: sb,
    blacklist: bl
  };
}


// urgency words dictionary 
function containsUrgentWords_(text) {
  text = (text || "").toLowerCase();
  var words = ["urgent", "immediately", "action required", "verify", "password reset", "locked", "suspended"];
  for (var i = 0; i < words.length; i++) {
    if (text.indexOf(words[i]) !== -1) return true;
  }
  return false;
}

// invoice words dictionary 
function containsInvoiceWords_(text) {
  text = (text || "").toLowerCase();
  var words = ["invoice", "payment", "overdue", "billing", "receipt", "past due"];
  for (var i = 0; i < words.length; i++) {
    if (text.indexOf(words[i]) !== -1) return true;
  }
  return false;
}

// url shorteners dictionary 
function hasShortenerUrl_(urls) {
  if (!urls || urls.length === 0) return false;
  var shorteners = ["tinyurl.com", "bit.ly", "t.co", "is.gd", "cutt.ly"];
  for (var i = 0; i < urls.length; i++) {
    var u = String(urls[i] || "").toLowerCase();
    for (var j = 0; j < shorteners.length; j++) {
      if (u.indexOf(shorteners[j]) !== -1) return true;
    }
  }
  return false;
}


// helper to strip HTML tags and extract clean plain text
function stripHtml_(html) {
  html = String(html || "");
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// helper to get the "clean" sender email
function getSenderEmail_(from) {
  var s = String(from || "");
  var m = s.match(/<([^>]+)>/);
  if (m && m[1]) return m[1].trim().toLowerCase();
  var m2 = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m2 ? m2[0].trim().toLowerCase() : "";
}

function instantHigh_(reason, urls, sb, bl) {
  return {
    risk: "High",
    score: 100,
    reasons: [reason],
    urls: urls || [],
    sb: sb || { ok: true, matches: [], error: "" },
    blacklist: bl || { emails: [], senderDomains: [], exactUrls: [], urlDomains: [] }
  };
}


function getHost_(u) {
  try {
    // Uses Regex to chop off the http:// and grab just the domain name
    var match = String(u || "").match(/^https?:\/\/(?:www\.)?([^\/:]+)/i);
    return match ? match[1].toLowerCase() : "";
  } catch (e) {
    return "";
  }
}

function normalizeUrl_(u) {
  var s = String(u || "").trim().toLowerCase();
  // Clean off any accidental punctuation at the end of the link
  return s.replace(/[).,!?]+$/g, "");
}
