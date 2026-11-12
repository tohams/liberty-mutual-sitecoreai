(function() {
  var growthShareLimitPercent = 20;

  // Use trusted, signed-in agent data. Incomplete data keeps the standard content.
  if (typeof profile === 'undefined' || !isLibertyMutualAgent(profile)) return 'Standard';
  var agent = profile.extensions || {};
  if (agent.productionCurrency !== 'USD' || agent.productionMetricScope !== 'agency') return 'Standard';

  // Rule 1: Agency growth. A Texas-licensed principal with room to grow small business.
  var isAgencyPrincipal = agent.role === 'principal';
  var isLicensedInTexas = agent.licensedInTexas === true;
  var smallBusinessSharePercent = agencySmallBusinessSharePercent(agent);
  var hasGrowthOpportunity = smallBusinessSharePercent !== null &&
    smallBusinessSharePercent < growthShareLimitPercent;

  if (isAgencyPrincipal && isLicensedInTexas && hasGrowthOpportunity) {
    return 'Agency growth';
  }

  // Rule 2: Producer priorities. An Illinois-licensed producer already writing small business.
  var isProducer = agent.role === 'producer';
  var isLicensedInIllinois = agent.licensedInIllinois === true;
  var specializesInSmallBusiness = agent.specializesInSmallCommercial === true;
  var hasIndividualSmallBusinessProduction = validPremiumCents(agent.agentSmallCommercialWrittenPremiumCents) &&
    agent.agentSmallCommercialWrittenPremiumCents > 0;

  if (isProducer && isLicensedInIllinois && specializesInSmallBusiness && hasIndividualSmallBusinessProduction) {
    return 'Producer priorities';
  }

  return 'Standard';

  // Validation and calculation helpers. Premiums arrive as whole USD cents.
  function isLibertyMutualAgent(visitor) {
    return visitor && visitor.type === 'identified' &&
      Array.isArray(visitor.identifiers) && visitor.identifiers.some(function(identity) {
        return identity && identity.provider === 'liberty-mutual-agent';
      });
  }

  function validPremiumCents(value) {
    return typeof value === 'number' && isFinite(value) && value >= 0 &&
      Math.floor(value) === value && value <= 9007199254740991;
  }

  function agencySmallBusinessSharePercent(agentData) {
    var personalPremium = agentData.agencyPersonalWrittenPremiumCents;
    var smallBusinessPremium = agentData.agencySmallCommercialWrittenPremiumCents;
    if (!validPremiumCents(personalPremium) || !validPremiumCents(smallBusinessPremium)) return null;

    var combinedPremium = personalPremium + smallBusinessPremium;
    if (!isFinite(combinedPremium) || combinedPremium <= 0 || combinedPremium > 9007199254740991) return null;

    return smallBusinessPremium / combinedPremium * 100;
  }
})()
