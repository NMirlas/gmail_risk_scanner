function safeBrowsingCheckUrls(urls) {
  // ensure urls is an array to prevent runtime errors later
  urls = urls || [];

  // check if the api key is saved value
  var key = PropertiesService.getScriptProperties().getProperty("SAFE_BROWSING_API_KEY");
  if (!key) return { ok: false, matches: [], error: "Missing SAFE_BROWSING_API_KEY" };
  if (urls.length === 0) return { ok: true, matches: [], error: "" };

  var apiUrl =
    "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" +
    encodeURIComponent(key);
  
  // api body that is being sent to safe browsing
  var body = {
    client: { clientId: "email-risk-scanner", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION"
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map(function (u) { return { url: u }; })
    }
  };
  // calling the api with try in case the api returns an error
  try {
    var res = UrlFetchApp.fetch(apiUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    // storing the response in variables
    var code = res.getResponseCode();
    var text = res.getContentText() || "";
  
    if (code !== 200) {
      return { ok: false, matches: [], error: "HTTP " + code + ": " + text.slice(0, 200) };
    }
    // parse the response text into a JSON object
    var json = {};
    try { json = JSON.parse(text); } catch (e) { json = {}; }

    return { ok: true, matches: json.matches || [], error: "" };
  } catch (e) {
    return { ok: false, matches: [], error: String(e) };
  }
}