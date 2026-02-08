// Pricing Engine Types
// Designed for algorithmic pricing based on pet characteristics

export type Species = 'dog' | 'cat';

export interface PetPricingInput {
  species: Species;
  breed: string;
  ageMonths: number;
  weightKg?: number;
  isNeutered?: boolean;
  hasPreexistingConditions?: boolean;
}

export interface PricingConfig {
  baseRate: number;
  currency: string;

  // Multipliers by category
  speciesMultipliers: Record<Species, number>;
  breedMultipliers: Record<string, number>;
  ageMultipliers: AgeMultiplierBand[];

  // Optional additional multipliers
  weightMultipliers?: WeightMultiplierBand[];
  conditionMultipliers?: Record<string, number>;

  // Price boundaries
  floorPrice: number;
  ceilingPrice: number;

  // Rounding
  roundToNearest: number; // e.g., 10 for rounding to nearest 10
}

export interface AgeMultiplierBand {
  minMonths: number;
  maxMonths: number;
  multiplier: number;
}

export interface WeightMultiplierBand {
  minKg: number;
  maxKg: number;
  multiplier: number;
}

export interface PricingResult {
  basePrice: number;
  finalPrice: number;
  currency: string;

  // Applied multipliers for transparency
  appliedMultipliers: {
    species: number;
    breed: number;
    age: number;
    weight?: number;
    condition?: number;
  };

  // Calculation breakdown
  breakdown: PricingBreakdownItem[];

  // Was price clamped to floor/ceiling?
  wasClamped: boolean;
  clampDirection?: 'floor' | 'ceiling';
}

export interface PricingBreakdownItem {
  label: string;
  factor: number;
  priceAfter: number;
}

// Subscription tier pricing
export interface SubscriptionPricing {
  tier: 'base' | 'plus_30' | 'plus_90' | 'plus_180' | 'plus_365';
  durationDays: number;
  basePrice: number;
  perPetPrices: {
    petId: string;
    petName: string;
    price: number;
    breakdown: PricingBreakdownItem[];
  }[];
  totalPrice: number;
  currency: string;
}

// Sachet pricing
export interface SachetPricing {
  sachetType: 'invitation' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
  isAlgorithmic: boolean; // true for D, E, F sachets
  basePrice?: number;
  computedPrice?: number;
  discountPercent?: number;
  finalPrice: number;
  currency: string;
  inclusions: string[];
}
