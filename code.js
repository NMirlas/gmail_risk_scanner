/**
 * basically the "main", three step of action
 * 1) extract email content
 * 2) analyze the content and evaluate risk
 * 3) create the side bar card with the risk,reasons,safe browsing and blacklist handle
 *  */ 
function buildAddOn(e) {
  var email = extractEmail(e);
  var analysis = analyzeEmail(email);
  return renderCard(email, analysis);
}