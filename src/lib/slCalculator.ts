/**
 * Sale-Leaseback Calculator
 * Implements StayFrank's Sell & Stay underwriting logic
 */

export interface SaleLeasebackResult {
  isEligible: boolean;
  availableCash: number;
  ineligibilityReasons: string[];
  ltv: number;
}

// Eligible states for Sale-Leaseback
export const SL_ELIGIBLE_STATES = [
  'AZ', 'NV', 'CA', 'CO', 'TX', 'GA', 'FL', 'TN', 'OH', 'IN', 'NC'
];

// Only Single Family homes are eligible
export const SL_ELIGIBLE_PROPERTY_TYPES = ['Single Family'];

// Min/Max property values
export const SL_MIN_HOME_VALUE = 200000;
export const SL_MAX_HOME_VALUE = 1500000;

// Max LTV for eligibility
export const SL_MAX_LTV = 65;

// Cash calculation percentage (70% of property value)
export const SL_CASH_PERCENTAGE = 0.70;

/**
 * Calculate Sale-Leaseback eligibility and offer
 */
export function calculateSaleLeaseback(
  homeValue: number,
  mortgageBalance: number,
  state: string,
  propertyType: string
): SaleLeasebackResult {
  const reasons: string[] = [];
  
  // Calculate LTV
  const ltv = homeValue > 0 ? (mortgageBalance / homeValue) * 100 : 0;
  
  // Check state eligibility
  if (!SL_ELIGIBLE_STATES.includes(state.toUpperCase())) {
    reasons.push(`State not eligible. Sale-Leaseback is available in: ${SL_ELIGIBLE_STATES.join(', ')}`);
  }
  
  // Check property type
  if (!SL_ELIGIBLE_PROPERTY_TYPES.includes(propertyType)) {
    reasons.push('Only Single Family homes are eligible for Sale-Leaseback');
  }
  
  // Check home value range
  if (homeValue < SL_MIN_HOME_VALUE) {
    reasons.push(`Property value must be at least $${SL_MIN_HOME_VALUE.toLocaleString()}`);
  }
  if (homeValue > SL_MAX_HOME_VALUE) {
    reasons.push(`Property value cannot exceed $${SL_MAX_HOME_VALUE.toLocaleString()}`);
  }
  
  // Check LTV
  if (ltv > SL_MAX_LTV) {
    reasons.push(`LTV must be 65% or less. Current LTV is ${ltv.toFixed(1)}%`);
  }
  
  // Calculate available cash: (70% of property value) - mortgage balance
  const availableCash = Math.max(0, (homeValue * SL_CASH_PERCENTAGE) - mortgageBalance);
  
  return {
    isEligible: reasons.length === 0,
    availableCash,
    ineligibilityReasons: reasons,
    ltv
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
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
