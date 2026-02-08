// Algorithmic Pricing Engine for Furrie
// Infrastructure ready for Excel workbook data integration

import type {
  PetPricingInput,
  PricingConfig,
  PricingResult,
  SubscriptionPricing,
  SachetPricing,
} from './types';

// Re-export types
export * from './types';

// Default consultation price when pricing engine is not configured
export const DEFAULT_CONSULTATION_PRICE = 799;
export const DEFAULT_CURRENCY = 'INR';

// Placeholder pricing config - will be replaced with Excel data
const DEFAULT_CONFIG: PricingConfig = {
  baseRate: 799,
  currency: 'INR',
  speciesMultipliers: {
    dog: 1.0,
    cat: 0.85,
  },
  breedMultipliers: {
    // Will be populated from Excel
    default: 1.0,
  },
  ageMultipliers: [
    { minMonths: 0, maxMonths: 12, multiplier: 0.9 },
    { minMonths: 12, maxMonths: 84, multiplier: 1.0 },
    { minMonths: 84, maxMonths: 999, multiplier: 1.15 },
  ],
  floorPrice: 499,
  ceilingPrice: 2999,
  roundToNearest: 10,
};

// Pricing configuration - can be loaded from database or config file
let pricingConfig: PricingConfig = DEFAULT_CONFIG;

/**
 * Load pricing configuration
 * Call this with data from Excel workbook or database
 */
export function loadPricingConfig(config: Partial<PricingConfig>): void {
  pricingConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    speciesMultipliers: {
      ...DEFAULT_CONFIG.speciesMultipliers,
      ...(config.speciesMultipliers || {}),
    },
    breedMultipliers: {
      ...DEFAULT_CONFIG.breedMultipliers,
      ...(config.breedMultipliers || {}),
    },
    ageMultipliers: config.ageMultipliers || DEFAULT_CONFIG.ageMultipliers,
  };
}

/**
 * Get the current pricing configuration
 */
export function getPricingConfig(): PricingConfig {
  return { ...pricingConfig };
}

/**
 * Compute consultation price for a pet
 */
export function computeConsultationPrice(pet: PetPricingInput): PricingResult {
  const breakdown: PricingResult['breakdown'] = [];
  let currentPrice = pricingConfig.baseRate;

  breakdown.push({
    label: 'Base Rate',
    factor: 1,
    priceAfter: currentPrice,
  });

  // Apply species multiplier
  const speciesMultiplier = pricingConfig.speciesMultipliers[pet.species] || 1.0;
  currentPrice *= speciesMultiplier;
  breakdown.push({
    label: `Species (${pet.species})`,
    factor: speciesMultiplier,
    priceAfter: currentPrice,
  });

  // Apply breed multiplier
  const breedLower = pet.breed.toLowerCase();
  const breedMultiplier = pricingConfig.breedMultipliers[breedLower] ||
                          pricingConfig.breedMultipliers['default'] || 1.0;
  currentPrice *= breedMultiplier;
  breakdown.push({
    label: `Breed (${pet.breed})`,
    factor: breedMultiplier,
    priceAfter: currentPrice,
  });

  // Apply age multiplier
  const ageBand = pricingConfig.ageMultipliers.find(
    band => pet.ageMonths >= band.minMonths && pet.ageMonths < band.maxMonths
  );
  const ageMultiplier = ageBand?.multiplier || 1.0;
  currentPrice *= ageMultiplier;
  breakdown.push({
    label: `Age (${pet.ageMonths} months)`,
    factor: ageMultiplier,
    priceAfter: currentPrice,
  });

  // Apply weight multiplier if configured
  let weightMultiplier = 1.0;
  if (pet.weightKg && pricingConfig.weightMultipliers) {
    const weightBand = pricingConfig.weightMultipliers.find(
      band => (pet.weightKg || 0) >= band.minKg && (pet.weightKg || 0) < band.maxKg
    );
    weightMultiplier = weightBand?.multiplier || 1.0;
    if (weightMultiplier !== 1.0) {
      currentPrice *= weightMultiplier;
      breakdown.push({
        label: `Weight (${pet.weightKg}kg)`,
        factor: weightMultiplier,
        priceAfter: currentPrice,
      });
    }
  }

  // Round to nearest configured value
  const roundedPrice = Math.round(currentPrice / pricingConfig.roundToNearest) *
                       pricingConfig.roundToNearest;

  // Apply floor and ceiling
  let finalPrice = roundedPrice;
  let wasClamped = false;
  let clampDirection: 'floor' | 'ceiling' | undefined;

  if (finalPrice < pricingConfig.floorPrice) {
    finalPrice = pricingConfig.floorPrice;
    wasClamped = true;
    clampDirection = 'floor';
  } else if (finalPrice > pricingConfig.ceilingPrice) {
    finalPrice = pricingConfig.ceilingPrice;
    wasClamped = true;
    clampDirection = 'ceiling';
  }

  return {
    basePrice: pricingConfig.baseRate,
    finalPrice,
    currency: pricingConfig.currency,
    appliedMultipliers: {
      species: speciesMultiplier,
      breed: breedMultiplier,
      age: ageMultiplier,
      weight: weightMultiplier !== 1.0 ? weightMultiplier : undefined,
    },
    breakdown,
    wasClamped,
    clampDirection,
  };
}

/**
 * Compute subscription pricing for multiple pets
 * Placeholder - will be updated with Excel workbook formulas
 */
export function computeSubscriptionPricing(
  pets: Array<PetPricingInput & { id: string; name: string }>,
  tier: SubscriptionPricing['tier']
): SubscriptionPricing {
  const durationMap: Record<typeof tier, number> = {
    base: 0,
    plus_30: 30,
    plus_90: 90,
    plus_180: 180,
    plus_365: 365,
  };

  const perPetPrices = pets.map(pet => {
    const result = computeConsultationPrice(pet);
    return {
      petId: pet.id,
      petName: pet.name,
      price: result.finalPrice,
      breakdown: result.breakdown,
    };
  });

  // For now, simple sum - will be replaced with tier-specific logic
  const totalPrice = perPetPrices.reduce((sum, pet) => sum + pet.price, 0);

  return {
    tier,
    durationDays: durationMap[tier],
    basePrice: DEFAULT_CONSULTATION_PRICE,
    perPetPrices,
    totalPrice,
    currency: pricingConfig.currency,
  };
}

/**
 * Get sachet pricing
 * Placeholder - will be updated with Excel workbook data
 */
export function getSachetPricing(
  sachetType: SachetPricing['sachetType'],
  pets?: Array<PetPricingInput & { id: string; name: string }>
): SachetPricing {
  // Sachet type configurations - placeholder
  const sachetConfigs: Record<SachetPricing['sachetType'], Partial<SachetPricing>> = {
    invitation: {
      isAlgorithmic: false,
      basePrice: 0,
      finalPrice: 0,
      inclusions: ['Base plan', '1 free consultation'],
    },
    a: {
      isAlgorithmic: false,
      basePrice: 799,
      finalPrice: 799,
      inclusions: ['Base plan only'],
    },
    b: {
      isAlgorithmic: false,
      basePrice: 1999,
      finalPrice: 1999,
      inclusions: ['Base plan', '3 consultations', 'Dual validity'],
    },
    c: {
      isAlgorithmic: false,
      basePrice: 999,
      finalPrice: 999,
      inclusions: ['Plus 30 days'],
    },
    d: {
      isAlgorithmic: true,
      discountPercent: 40,
      inclusions: ['Plus 365 days'],
    },
    e: {
      isAlgorithmic: true,
      discountPercent: 30,
      inclusions: ['Plus 180 days'],
    },
    f: {
      isAlgorithmic: true,
      discountPercent: 20,
      inclusions: ['Plus 90 days'],
    },
  };

  const config = sachetConfigs[sachetType];

  // For algorithmic sachets, compute price based on pets
  if (config.isAlgorithmic && pets && pets.length > 0) {
    const subscriptionResult = computeSubscriptionPricing(pets, 'plus_365');
    const computedPrice = subscriptionResult.totalPrice;
    const discountAmount = computedPrice * ((config.discountPercent || 0) / 100);
    const finalPrice = Math.round((computedPrice - discountAmount) / 10) * 10;

    return {
      sachetType,
      isAlgorithmic: true,
      computedPrice,
      discountPercent: config.discountPercent,
      finalPrice,
      currency: pricingConfig.currency,
      inclusions: config.inclusions || [],
    };
  }

  return {
    sachetType,
    isAlgorithmic: config.isAlgorithmic || false,
    basePrice: config.basePrice,
    finalPrice: config.finalPrice || config.basePrice || 0,
    currency: pricingConfig.currency,
    inclusions: config.inclusions || [],
  };
}

/**
 * Check if pricing engine is configured (has Excel data loaded)
 */
export function isPricingEngineConfigured(): boolean {
  // Will return true once Excel data is loaded
  return Object.keys(pricingConfig.breedMultipliers).length > 1;
}
