function extractEmail(e) {
  var out = {
    from: "",
    subject: "",
    plain: "",
    html: "",
    urls: []
  };
  // check whether the email object is not empty
  var messageId = (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : "";
  if (!messageId) return out;

  try {
    // using gmailApp cause its already decoding the email content
    var msg = GmailApp.getMessageById(messageId);

    // saving the relevant parts for the analysis 
    out.from = msg.getFrom() || "";
    out.subject = msg.getSubject() || "";
    out.html = msg.getBody() || "";
    out.plain = msg.getPlainBody() || "";

    // array for the urls inside the email
    var urls = [];
    var full = (out.html || "") + "\n" + (out.plain || "");

    // Visible URLs
    var linkRegex = /https?:\/\/[^\s<>"'\])]+/gi;
    urls = urls.concat(full.match(linkRegex) || []);

    // Clickable ("href") URLs
    var hrefRegex = /href\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi;
    var m;
    while ((m = hrefRegex.exec(out.html)) !== null) {
      var link = m[1] || m[2];
      if (link && String(link).toLowerCase().indexOf("http") === 0) {
        urls.push(link);
      }
    }

    out.urls = cleanAndDedupeUrls_(urls);

  } catch (err) {
    Logger.log("extractEmail error: " + err);
  }

  return out;
}

// deleting duplicate urls if extracted from the email
function cleanAndDedupeUrls_(urls) {
  urls = urls || [];
  var out = [];
  var seen = {};

  for (var i = 0; i < urls.length; i++) {
    var u = String(urls[i] || "").trim();
    if (!u) continue;

    var low = u.toLowerCase();
    if (low.indexOf("mailto:") === 0) continue;
    if (low.indexOf("javascript:") === 0) continue;

    u = u.replace(/[).,!?]+$/g, "");

    if (!seen[u]) {
      seen[u] = true;
      out.push(u);
    }
  }
  return out;
}