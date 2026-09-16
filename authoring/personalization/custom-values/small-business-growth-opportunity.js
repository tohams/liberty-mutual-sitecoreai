(function() {
  if (typeof profile === 'undefined' || !profile || profile.type !== 'identified') return false;
  var identities = profile.identifiers;
  if (!Array.isArray(identities) || !identities.some(function(identity) {
    return identity && identity.provider === 'liberty-mutual-agent';
  })) return false;
  var attributes = profile.extensions || {};
  if (['principal', 'producer'].indexOf(attributes.role) < 0) return false;
  var personal = attributes.agencyPersonalWrittenPremiumCents;
  var smallBusiness = attributes.agencySmallCommercialWrittenPremiumCents;
  if (typeof personal !== 'number' || typeof smallBusiness !== 'number' ||
      !isFinite(personal) || !isFinite(smallBusiness) || personal < 0 || smallBusiness < 0) return false;
  var combined = personal + smallBusiness;
  return isFinite(combined) && combined > 0 && smallBusiness / combined < 0.20;
})()
