function renderCard(email, analysis) {
  email = email || {};
  analysis = analysis || {};

  // the add-on UI is built as a Card displayed in the Gmail sidebar
  var card = CardService.newCardBuilder();

  // default risk is low if the analysis didnt find anything
  var risk = analysis.risk || "Low";
  // default score is 0 if the analysis didnt find anything
  var score = (analysis.score === 0 || analysis.score) ? analysis.score : 0;

  // build the header of the card with the title,risk and score
  card.setHeader(
    CardService.newCardHeader()
      .setTitle("Email Risk Scanner")
      .setSubtitle("Risk: " + risk + " | Score: " + score + "/100")
  );

  var section = CardService.newCardSection()
    .addWidget(CardService.newKeyValue().setTopLabel("From").setContent(email.from || "(not found)"))
    .addWidget(CardService.newKeyValue().setTopLabel("Subject").setContent(email.subject || "(not found)"));

  // reasons section - explain the score the email got
  var reasons = analysis.reasons || [];
  section.addWidget(CardService.newDivider());
  section.addWidget(CardService.newTextParagraph().setText("<b>Top reasons</b>"));
  if (reasons.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText("• No obvious red flags"));
  } else {
    for (var i = 0; i < reasons.length; i++) {
      section.addWidget(CardService.newTextParagraph().setText("• " + escapeHtml_(reasons[i])));
    }
  }

  // urls section - display up to 6 URLs extracted from the email
  var urls = analysis.urls || [];
  section.addWidget(CardService.newDivider());
  section.addWidget(CardService.newTextParagraph().setText("<b>URLs (" + urls.length + ")</b>"));
  if (urls.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText("• none"));
  } else {
    var limit = Math.min(urls.length, 6);
    for (var u = 0; u < limit; u++) {
      section.addWidget(CardService.newTextParagraph().setText("• " + escapeHtml_(urls[u])));
    }
    if (urls.length > limit) {
      section.addWidget(CardService.newTextParagraph().setText("… and " + (urls.length - limit) + " more"));
    }
  }

  // Safe Browsing section - show the safe browsing api result, whether cached or called 
  var sb = analysis.sb || { ok: true, matches: [], error: "", cache: { hits: 0, checked: 0, total: 0 } };
  section.addWidget(CardService.newDivider());
  if (!sb.ok) {
    section.addWidget(CardService.newTextParagraph().setText("<b>Safe Browsing</b>: failed: " + escapeHtml_(sb.error || "unknown")));
  } else {
    section.addWidget(CardService.newTextParagraph().setText("<b>Safe Browsing matches</b>: " + (sb.matches || []).length));
  }
  if (sb.cache) {
    section.addWidget(CardService.newTextParagraph().setText(
      "cache: hits=" + (sb.cache.hits || 0) + " checked=" + (sb.cache.checked || 0) + " total=" + (sb.cache.total || 0)
    ));
  }

  card.addSection(section);

  // Blacklist UI - display the total number of items currently in the blacklist database
  var bl = analysis.blacklist || { emails: [], senderDomains: [], exactUrls: [], urlDomains: [] };

  var blSection = CardService.newCardSection().setHeader("Blacklist");

  blSection.addWidget(
    CardService.newTextParagraph().setText(
      "Emails: " + (bl.emails ? bl.emails.length : 0) +
      " | Sender domains: " + (bl.senderDomains ? bl.senderDomains.length : 0) +
      " | URLs: " + (bl.exactUrls ? bl.exactUrls.length : 0) +
      " | URL domains: " + (bl.urlDomains ? bl.urlDomains.length : 0)
    )
  );

  // buttons to interact with the blacklist
  blSection.addWidget(
    CardService.newTextInput()
      .setFieldName("bl_input")
      .setTitle("Add / Delete email, domain, or full URL")
      .setHint("no-reply@example.com | example.com | https://example.com/path")
  );

  var addBtn = CardService.newTextButton()
    .setText("Add")
    .setOnClickAction(CardService.newAction().setFunctionName("onAddToBlacklist"))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED);

  var delBtn = CardService.newTextButton()
    .setText("Delete")
    .setOnClickAction(CardService.newAction().setFunctionName("onDeleteFromBlacklist"))
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT);

  blSection.addWidget(CardService.newButtonSet().addButton(addBtn).addButton(delBtn));
  card.addSection(blSection);

  return card.build();
}

// the functions to interact with the blacklist
function onAddToBlacklist(e) {
  var val = getFormValue_(e, "bl_input");
  var res = addToBlacklistSheet(val);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(res.msg || "Done"))
    .build();
}

function onDeleteFromBlacklist(e) {
  var val = getFormValue_(e, "bl_input");
  var res = deleteFromBlacklistSheet(val);
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(res.msg || "Done"))
    .build();
}

// helper to safely extract user input from the CardService event object
function getFormValue_(e, key) {
  try {
    return e.commonEventObject.formInputs[key].stringInputs.value[0] || "";
  } catch (err) {
    return "";
  }
}

// Helper to sanitize text before rendering it in the UI to prevent injection errors
function escapeHtml_(s) {
  s = (s === null || s === undefined) ? "" : String(s);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}