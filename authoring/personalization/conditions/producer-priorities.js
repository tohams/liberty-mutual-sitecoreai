(function() {
  var selectedRole = '[[Agent role | enum(Agency principal, Producer, Account manager, Account executive, Surety specialist, Wholesale broker) | Producer]]';
  var selectedState = '[[Licensed state | enum(Texas, Florida, Illinois) | Illinois]]';
  var minimumPremium = Number('[[Minimum premium | number | 0]]');
  var roles = {
    'Agency principal': 'principal',
    'Producer': 'producer',
    'Account manager': 'account-manager',
    'Account executive': 'account-executive',
    'Surety specialist': 'surety-specialist',
    'Wholesale broker': 'wholesale-broker'
  };
  var licenses = {
    'Texas': 'licensedInTexas',
    'Florida': 'licensedInFlorida',
    'Illinois': 'licensedInIllinois'
  };
  if (typeof profile === 'undefined' || !profile || profile.type !== 'identified') return false;
  if (!Array.isArray(profile.identifiers) || !profile.identifiers.some(function(identity) {
    return identity && identity.provider === 'liberty-mutual-agent';
  })) return false;
  var attributes = profile.extensions || {};
  if (!Object.prototype.hasOwnProperty.call(roles, selectedRole) ||
      !Object.prototype.hasOwnProperty.call(licenses, selectedState)) return false;
  if (attributes.role !== roles[selectedRole] || attributes[licenses[selectedState]] !== true) return false;
  if (attributes.productionCurrency !== 'USD' || attributes.productionMetricScope !== 'agency') return false;
  if (attributes.specializesInSmallCommercial !== true) return false;
  if (!isFinite(minimumPremium) || minimumPremium < 0) return false;
  var minimumCents = Math.round(minimumPremium * 100);
  if (!isFinite(minimumCents) || minimumCents > 9007199254740991 ||
      Math.abs(minimumPremium - minimumCents / 100) > 0.0000001) return false;
  var premium = attributes.agentSmallCommercialWrittenPremiumCents;
  if (typeof premium !== 'number' || !isFinite(premium) || premium < 0 ||
      Math.floor(premium) !== premium || premium > 9007199254740991) return false;
  return premium > minimumCents;
})()
