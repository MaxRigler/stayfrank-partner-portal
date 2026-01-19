/**
 * HEA (Home Equity Agreement) Calculator
 * Implements the 19.9% Annualized Cost Cap logic for HEI offers
 */

export interface HEACalculationResult {
  payoff: number;
  apr: number;
  isCapped: boolean;
  totalCost: number;
  rawUnlockShare: number;
  maximumUnlockShare: number;
  endingHomeValue: number;
}

export interface HEIEligibilityResult {
  isEligible: boolean;
  maxInvestment: number;
  ineligibilityReasons: string[];
}

export interface PropertyValidation {
  isValid: boolean;
  errors: string[];
  homeValue?: number;
  state?: string;
}

// Eligible states for HEI (Unlock's coverage)
export const HEI_ELIGIBLE_STATES = [
  'AZ', 'CA', 'FL', 'HI', 'ID', 'IN', 'KY', 'MI', 'MO', 'MT',
  'NV', 'NH', 'NJ', 'NM', 'NC', 'OH', 'OR', 'PA', 'SC', 'TN',
  'UT', 'VA', 'DC', 'WI', 'WY'
];

// Alias for backward compatibility
export const ELIGIBLE_STATES = HEI_ELIGIBLE_STATES;

// Property types that are NOT eligible (matches RentCast values)
export const INELIGIBLE_PROPERTY_TYPES = ['Manufactured', 'Apartment', 'Land'];

// Ownership types that are NOT eligible
export const INELIGIBLE_OWNERSHIP_TYPES = ['LLC', 'Corporation', 'Partnership'];

// Maximum Unlock Percentage (the future share Unlock can take)
export const MAX_UNLOCK_PERCENTAGE = 0.499; // 49.9%

// Standard Exchange Rate (multiplier)
export const EXCHANGE_RATE = 2.0;

// Min/Max values for HEI
export const HEI_MIN_HOME_VALUE = 175000;
export const HEI_MAX_HOME_VALUE = 3000000;
export const HEI_MIN_INVESTMENT = 15000;
export const HEI_MAX_INVESTMENT = 500000;
export const HEI_MAX_CLTV = 80; // 80% max CLTV

/**
 * Calculate maximum investment based on CLTV and Unlock Percentage constraints
 */
export function calculateMaxInvestment(
  homeValue: number,
  mortgageBalance: number,
  maxCLTV: number = 0.8,
  maxUnlockPercentage: number = MAX_UNLOCK_PERCENTAGE,
  exchangeRate: number = EXCHANGE_RATE,
  absoluteMax: number = HEI_MAX_INVESTMENT
): number {
  // Max based on CLTV
  const cltvMax = (homeValue * maxCLTV) - mortgageBalance;

  // Max based on Unlock Percentage constraint
  const maxInvestmentPercentage = maxUnlockPercentage / exchangeRate;
  const percentMax = homeValue * maxInvestmentPercentage;

  // Return the minimum of all caps
  return Math.max(0, Math.min(cltvMax, percentMax, absoluteMax));
}

/**
 * Calculate HEI eligibility
 */
export function calculateHEIEligibility(
  homeValue: number,
  mortgageBalance: number,
  state: string,
  propertyType: string,
  ownershipType: string
): HEIEligibilityResult {
  const reasons: string[] = [];

  // Check state eligibility
  if (!HEI_ELIGIBLE_STATES.includes(state.toUpperCase())) {
    reasons.push(`State not eligible for HEI. Available states: AZ, CA, FL, HI, ID, IN, KY, MI, MO, MT, NV, NH, NJ, NM, NC, OH, OR, PA, SC, TN, UT, VA, DC, WI, WY`);
  }

  // Check property type
  if (INELIGIBLE_PROPERTY_TYPES.includes(propertyType)) {
    reasons.push(`${propertyType} properties are not eligible for HEI`);
  }

  // Check ownership type
  if (INELIGIBLE_OWNERSHIP_TYPES.includes(ownershipType)) {
    reasons.push(`Properties owned by ${ownershipType} are not eligible. Must be personally owned or in a Trust`);
  }

  // Check home value range
  if (homeValue < HEI_MIN_HOME_VALUE) {
    reasons.push(`Home value must be at least $${HEI_MIN_HOME_VALUE.toLocaleString()}`);
  }
  if (homeValue > HEI_MAX_HOME_VALUE) {
    reasons.push(`Home value cannot exceed $${HEI_MAX_HOME_VALUE.toLocaleString()}`);
  }

  // Calculate CLTV
  const cltv = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
  if (cltv > HEI_MAX_CLTV) {
    reasons.push(`LTV must be 80% or less. Current LTV is ${cltv.toFixed(1)}%`);
  }

  // Calculate max investment
  const maxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);

  if (maxInvestment < HEI_MIN_INVESTMENT) {
    reasons.push(`Available equity must allow for a minimum investment of $${HEI_MIN_INVESTMENT.toLocaleString()}`);
  }

  return {
    isEligible: reasons.length === 0,
    maxInvestment,
    ineligibilityReasons: reasons
  };
}

/**
 * Calculates the HEA Payoff using the 19.9% Annualized Cost Cap logic
 */
export function calculateHEACost(
  investment: number,
  startingValue: number,
  termYears: number,
  hpaRate: number,
  multiplier: number = 2.0
): HEACalculationResult {
  const costLimit = 0.199; // 19.9% Cap
  const endingHomeValue = startingValue * Math.pow(1 + hpaRate, termYears);

  const investmentPercentage = investment / startingValue;
  const unlockPercentage = investmentPercentage * multiplier;
  const rawUnlockShare = endingHomeValue * unlockPercentage;

  const maximumUnlockShare = investment * Math.pow(1 + costLimit, termYears);

  const finalPayoff = Math.min(rawUnlockShare, maximumUnlockShare);
  const isCapped = rawUnlockShare > maximumUnlockShare;

  const effectiveApr = Math.pow(finalPayoff / investment, 1 / termYears) - 1;

  return {
    payoff: finalPayoff,
    apr: effectiveApr * 100,
    isCapped: isCapped,
    totalCost: finalPayoff - investment,
    rawUnlockShare,
    maximumUnlockShare,
    endingHomeValue
  };
}

/**
 * Validate property eligibility for both SL and HEI
 */
export function validateProperty(
  state: string,
  propertyType: string,
  ownershipType: string,
  homeValue: number
): PropertyValidation {
  const errors: string[] = [];

  // Check state eligibility for HEI
  if (!HEI_ELIGIBLE_STATES.includes(state.toUpperCase())) {
    errors.push(`Property must be in an eligible state. ${state} is not currently supported for HEI.`);
  }

  // Check property type
  if (INELIGIBLE_PROPERTY_TYPES.includes(propertyType)) {
    errors.push(`${propertyType} properties are not eligible for this program.`);
  }

  // Check ownership type
  if (INELIGIBLE_OWNERSHIP_TYPES.includes(ownershipType)) {
    errors.push(`Properties owned by ${ownershipType} are not eligible. Property must be personally owned.`);
  }

  // Check home value range
  if (homeValue < HEI_MIN_HOME_VALUE) {
    errors.push(`Home value must be at least $${HEI_MIN_HOME_VALUE.toLocaleString()}.`);
  }
  if (homeValue > HEI_MAX_HOME_VALUE) {
    errors.push(`Home value cannot exceed $${HEI_MAX_HOME_VALUE.toLocaleString()}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    homeValue: errors.length === 0 ? homeValue : undefined,
    state: errors.length === 0 ? state : undefined
  };
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Dual-product eligibility result
 */
export interface DualProductEligibility {
  slEligible: boolean;
  heiEligible: boolean;
  eitherEligible: boolean;
  slOfferAmount: number;
  heiMaxInvestment: number;
  higherAmount: number;
  combinedReasons: string[];
}

// Sale-Leaseback constants (imported logic from slCalculator)
const SL_ELIGIBLE_STATES = ['AZ', 'NV', 'CA', 'CO', 'TX', 'GA', 'FL', 'TN', 'OH', 'IN', 'NC'];
const SL_ELIGIBLE_PROPERTY_TYPES = ['Single Family'];
const SL_MIN_HOME_VALUE = 200000;
const SL_MAX_HOME_VALUE = 1500000;
const SL_MAX_LTV = 65;
const SL_CASH_PERCENTAGE = 0.70;

/**
 * Check eligibility for BOTH Sale-Leaseback and HEI products
 * Returns true if property qualifies for at least one product
 */
export function checkDualProductEligibility(
  homeValue: number,
  mortgageBalance: number,
  state: string,
  propertyType: string,
  ownershipType: string
): DualProductEligibility {
  const stateUpper = state.toUpperCase();
  const ltv = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;

  // ---- Check Sale-Leaseback Eligibility ----
  const slReasons: string[] = [];

  if (!SL_ELIGIBLE_STATES.includes(stateUpper)) {
    slReasons.push(`State not eligible for Sale-Leaseback (requires: ${SL_ELIGIBLE_STATES.join(', ')})`);
  }
  if (!SL_ELIGIBLE_PROPERTY_TYPES.includes(propertyType)) {
    slReasons.push('Only Single Family homes are eligible for Sale-Leaseback');
  }
  // Ownership type check - LLCs, Corporations, and Partnerships are not eligible for Sale-Leaseback
  if (INELIGIBLE_OWNERSHIP_TYPES.includes(ownershipType)) {
    slReasons.push(`Properties owned by ${ownershipType} are not eligible for Sale-Leaseback`);
  }
  if (homeValue < SL_MIN_HOME_VALUE) {
    slReasons.push(`Property value must be at least $${SL_MIN_HOME_VALUE.toLocaleString()} for Sale-Leaseback`);
  }
  if (homeValue > SL_MAX_HOME_VALUE) {
    slReasons.push(`Property value cannot exceed $${SL_MAX_HOME_VALUE.toLocaleString()} for Sale-Leaseback`);
  }
  if (ltv > SL_MAX_LTV) {
    slReasons.push(`LTV must be 65% or less for Sale-Leaseback (current: ${ltv.toFixed(1)}%)`);
  }

  const slEligible = slReasons.length === 0;
  const slOfferAmount = slEligible ? Math.max(0, (homeValue * SL_CASH_PERCENTAGE) - mortgageBalance) : 0;

  // ---- Check HEI Eligibility ----
  const heiResult = calculateHEIEligibility(homeValue, mortgageBalance, state, propertyType, ownershipType);
  const heiEligible = heiResult.isEligible;
  const heiMaxInvestment = heiResult.maxInvestment;

  // ---- Combine Results ----
  const eitherEligible = slEligible || heiEligible;
  const higherAmount = Math.max(slOfferAmount, heiMaxInvestment);

  // Only show combined reasons if NEITHER product qualifies
  let combinedReasons: string[] = [];
  if (!eitherEligible) {
    // Show generic disqualification reasons (without mentioning product names explicitly)
    const reasons: string[] = [];

    // State check
    const slStateOk = SL_ELIGIBLE_STATES.includes(stateUpper);
    const heiStateOk = HEI_ELIGIBLE_STATES.includes(stateUpper);
    if (!slStateOk && !heiStateOk) {
      reasons.push(`${state} is not eligible for StayFrank's solutions`);
    }

    // Property type check
    const slTypeOk = SL_ELIGIBLE_PROPERTY_TYPES.includes(propertyType);
    const heiTypeOk = !INELIGIBLE_PROPERTY_TYPES.includes(propertyType);
    if (!slTypeOk && !heiTypeOk) {
      reasons.push(`${propertyType} properties are not eligible`);
    }

    // Ownership type check (HEI only)
    if (INELIGIBLE_OWNERSHIP_TYPES.includes(ownershipType)) {
      reasons.push(`Properties owned by ${ownershipType} are not eligible`);
    }

    // Home value check
    if (homeValue < HEI_MIN_HOME_VALUE) {
      reasons.push(`Home value must be at least $${HEI_MIN_HOME_VALUE.toLocaleString()}`);
    }
    if (homeValue > HEI_MAX_HOME_VALUE) {
      reasons.push(`Home value cannot exceed $${HEI_MAX_HOME_VALUE.toLocaleString()}`);
    }

    // LTV check (use the more lenient HEI threshold of 80%)
    if (ltv > HEI_MAX_CLTV) {
      reasons.push(`LTV must be 80% or less (current: ${ltv.toFixed(1)}%)`);
    }

    // Min investment check
    const potentialMaxInvestment = calculateMaxInvestment(homeValue, mortgageBalance);
    if (potentialMaxInvestment < HEI_MIN_INVESTMENT) {
      reasons.push(`Available equity must allow for a minimum investment of $${HEI_MIN_INVESTMENT.toLocaleString()}`);
    }

    combinedReasons = reasons;
  }

  return {
    slEligible,
    heiEligible,
    eitherEligible,
    slOfferAmount,
    heiMaxInvestment,
    higherAmount,
    combinedReasons
  };
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
