(function() {
  var selectedRole = '[[Agent role | enum(Agency principal, Producer, Account manager, Account executive, Surety specialist, Wholesale broker) | Agency principal]]';
  var selectedState = '[[Licensed state | enum(Texas, Florida, Illinois) | Texas]]';
  var maximumShare = Number('[[Share threshold | number | 20]]');
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
  if (!isFinite(maximumShare) || maximumShare < 0 || maximumShare > 100) return false;
  function validCents(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0 &&
      Math.floor(value) === value && value <= 9007199254740991;
  }
  var personal = attributes.agencyPersonalWrittenPremiumCents;
  var smallBusiness = attributes.agencySmallCommercialWrittenPremiumCents;
  if (!validCents(personal) || !validCents(smallBusiness)) return false;
  var combined = personal + smallBusiness;
  if (!isFinite(combined) || combined <= 0 || combined > 9007199254740991) return false;
  return smallBusiness / combined * 100 < maximumShare;
})()
