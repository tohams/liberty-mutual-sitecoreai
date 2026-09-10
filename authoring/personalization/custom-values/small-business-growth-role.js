(function() {
  if (typeof profile === 'undefined' || !profile || profile.type !== 'identified') return 'neutral';
  var identities = profile.identifiers || [];
  var isAgent = identities.some(function(identity) {
    return identity.provider === 'liberty-mutual-agent';
  });
  var attributes = profile.extensions || {};
  if (!isAgent || attributes.smallBusinessGrowthAudience !== true) return 'neutral';
  return ['principal', 'producer', 'account-manager'].indexOf(attributes.role) >= 0 ? attributes.role : 'neutral';
})()
