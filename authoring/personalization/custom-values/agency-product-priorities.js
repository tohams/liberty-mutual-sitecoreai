(function() {
  if (typeof profile === 'undefined' || !profile || profile.type !== 'identified') return 'neutral';
  if (!Array.isArray(profile.identifiers) || !profile.identifiers.some(function(identity) {
    return identity && identity.provider === 'liberty-mutual-agent';
  })) return 'neutral';
  var attributes = profile.extensions || {};
  if (attributes.productionCurrency !== 'USD' || attributes.productionMetricScope !== 'agency') return 'neutral';
  function validCents(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0 && Math.floor(value) === value;
  }
  if (attributes.role === 'principal' && attributes.licensedInTexas === true) {
    var personal = attributes.agencyPersonalWrittenPremiumCents;
    var smallBusiness = attributes.agencySmallCommercialWrittenPremiumCents;
    if (!validCents(personal) || !validCents(smallBusiness)) return 'neutral';
    var combined = personal + smallBusiness;
    if (isFinite(combined) && combined > 0 && smallBusiness / combined < 0.20) return 'agency-growth';
  }
  if (attributes.role === 'producer' && attributes.licensedInIllinois === true &&
      attributes.specializesInSmallCommercial === true &&
      validCents(attributes.agentSmallCommercialWrittenPremiumCents) &&
      attributes.agentSmallCommercialWrittenPremiumCents > 0) return 'producer-priorities';
  return 'neutral';
})()
