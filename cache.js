function safeBrowsingCheckUrlsCached(urls) {
  // ensure urls is an array to prevent runtime errors later
  urls = urls || [];
  var cache = CacheService.getScriptCache();

  var hits = 0;
  var toCheck = [];
  var total = urls.length;

  // if any cached URL is flagged -> immediate match
  for (var i = 0; i < urls.length; i++) {
    var u = normalizeUrl_(urls[i]);
    if (!u) continue;

    var k = "sb:" + u;
    var c = cache.get(k);

    if (c !== null) {
      hits++;
      if (c === "1") {
        return {
          ok: true,
          matches: [{ threat: { url: u }, threatType: "CACHED_FLAG" }],
          error: "",
          cache: { hits: hits, checked: 0, total: total }
        };
      }
    } else {
      toCheck.push(u);
    }
  }

  // nothing new to check
  if (toCheck.length === 0) {
    return { ok: true, matches: [], error: "", cache: { hits: hits, checked: 0, total: total } };
  }

  // call api for uncached URLs
  var api = safeBrowsingCheckUrls(toCheck);

  // the safe browsing result are saved for 6 hours 
  var ttl = 6 * 60 * 60; // 6 hours

  // build lookup of flagged urls returned by api
  var flagged = {};
  if (api.ok && api.matches) {
    for (var m = 0; m < api.matches.length; m++) {
      var url = api.matches[m] && api.matches[m].threat && api.matches[m].threat.url;
      if (url) flagged[normalizeUrl_(url)] = true;
    }
  }

  // write cache: "1" flagged, "0" safe
  for (var j = 0; j < toCheck.length; j++) {
    var url2 = toCheck[j];
    cache.put("sb:" + url2, flagged[url2] ? "1" : "0", ttl);
  }

  return {
    ok: !!api.ok,
    matches: api.matches || [],
    error: api.error || "",
    cache: { hits: hits, checked: toCheck.length, total: total }
  };
}