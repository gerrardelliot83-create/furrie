/**
 * Breeds Data Conversion Script
 *
 * Reads dog and cat breeds from Excel file and generates TypeScript data file.
 * Only uses "Dog Breeds" and "Cat Breeds" sheets (main source of truth).
 *
 * Usage: npx ts-node scripts/convert-breeds.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface RawBreed {
  'Breed Name': string;
  'Lifespan (Years)': string;
  'Weight (kg)': string;
  'Height (cm)': string;
  'Coat Colors': string;
  'Found in India': string;
  'Indian Native': string;
  'Primary Source': string;
}

interface Breed {
  name: string;
  lifespan: string;
  weight: string;
  height: string;
  coatColors: string[];
  foundInIndia: 'Yes' | 'Rare' | 'No';
  indianNative: boolean;
}

function parseFoundInIndia(value: string): 'Yes' | 'Rare' | 'No' {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'rare') return 'Rare';
  return 'No';
}

function parseCoatColors(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 5);
}

function convertBreed(raw: RawBreed): Breed {
  return {
    name: raw['Breed Name']?.trim() || '',
    lifespan: raw['Lifespan (Years)']?.toString().trim() || '',
    weight: raw['Weight (kg)']?.toString().trim() || '',
    height: raw['Height (cm)']?.toString().trim() || '',
    coatColors: parseCoatColors(raw['Coat Colors']),
    foundInIndia: parseFoundInIndia(raw['Found in India']),
    indianNative: raw['Indian Native']?.toLowerCase().trim() === 'yes',
  };
}

function sortBreeds(breeds: Breed[]): Breed[] {
  return breeds.sort((a, b) => {
    if (a.indianNative && !b.indianNative) return -1;
    if (!a.indianNative && b.indianNative) return 1;
    if (a.foundInIndia === 'Yes' && b.foundInIndia !== 'Yes') return -1;
    if (a.foundInIndia !== 'Yes' && b.foundInIndia === 'Yes') return 1;
    if (a.foundInIndia === 'Rare' && b.foundInIndia === 'No') return -1;
    if (a.foundInIndia === 'No' && b.foundInIndia === 'Rare') return 1;
    return a.name.localeCompare(b.name);
  });
}

function main() {
  const excelPath = path.join(
    __dirname,
    '..',
    'docs',
    'Comprehensive_Dog_Cat_Breed_Database.xlsx'
  );
  const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'breeds.ts');

  console.log('Reading Excel file:', excelPath);

  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);

  const dogSheet = workbook.Sheets['Dog Breeds'];
  if (!dogSheet) {
    console.error('Sheet "Dog Breeds" not found');
    process.exit(1);
  }
  const dogBreeds: RawBreed[] = XLSX.utils.sheet_to_json(dogSheet);
  console.log('Found ' + dogBreeds.length + ' dog breeds');

  const catSheet = workbook.Sheets['Cat Breeds'];
  if (!catSheet) {
    console.error('Sheet "Cat Breeds" not found');
    process.exit(1);
  }
  const catBreeds: RawBreed[] = XLSX.utils.sheet_to_json(catSheet);
  console.log('Found ' + catBreeds.length + ' cat breeds');

  const dogs = sortBreeds(dogBreeds.map(convertBreed).filter((b) => b.name));
  const cats = sortBreeds(catBreeds.map(convertBreed).filter((b) => b.name));

  console.log('Processed ' + dogs.length + ' dogs, ' + cats.length + ' cats');

  const output = `/**
 * Breeds Data - Auto-generated from Excel
 * Source: docs/Comprehensive_Dog_Cat_Breed_Database.xlsx
 * Generated: ${new Date().toISOString()}
 *
 * DO NOT EDIT MANUALLY - Run \`npx ts-node scripts/convert-breeds.ts\` to regenerate
 */

export interface Breed {
  name: string;
  lifespan: string;
  weight: string;
  height: string;
  coatColors: string[];
  foundInIndia: 'Yes' | 'Rare' | 'No';
  indianNative: boolean;
}

export const DOG_BREEDS: Breed[] = ${JSON.stringify(dogs, null, 2)};

export const CAT_BREEDS: Breed[] = ${JSON.stringify(cats, null, 2)};

// Helper functions

/**
 * Get all breeds for a species
 */
export function getBreedsBySpecies(species: 'dog' | 'cat'): Breed[] {
  return species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
}

/**
 * Get just breed names for a species (for simple dropdowns)
 */
export function getBreedNames(species: 'dog' | 'cat'): string[] {
  return getBreedsBySpecies(species).map((b) => b.name);
}

/**
 * Search breeds by name (case-insensitive partial match)
 */
export function searchBreeds(query: string, species?: 'dog' | 'cat'): Breed[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const breeds = species
    ? getBreedsBySpecies(species)
    : [...DOG_BREEDS, ...CAT_BREEDS];

  return breeds.filter((b) =>
    b.name.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get breeds commonly found in India ("Yes" or "Rare")
 */
export function getBreedsFoundInIndia(species?: 'dog' | 'cat'): Breed[] {
  const breeds = species
    ? getBreedsBySpecies(species)
    : [...DOG_BREEDS, ...CAT_BREEDS];

  return breeds.filter((b) => b.foundInIndia === 'Yes' || b.foundInIndia === 'Rare');
}

/**
 * Get Indian native breeds only
 */
export function getIndianNativeBreeds(species?: 'dog' | 'cat'): Breed[] {
  const breeds = species
    ? getBreedsBySpecies(species)
    : [...DOG_BREEDS, ...CAT_BREEDS];

  return breeds.filter((b) => b.indianNative);
}

/**
 * Find a breed by exact name
 */
export function findBreedByName(name: string, species?: 'dog' | 'cat'): Breed | undefined {
  const breeds = species
    ? getBreedsBySpecies(species)
    : [...DOG_BREEDS, ...CAT_BREEDS];

  return breeds.find((b) => b.name.toLowerCase() === name.toLowerCase());
}
`;

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, output, 'utf-8');
  console.log('Generated:', outputPath);

  const indianNativeDogs = dogs.filter((b) => b.indianNative).length;
  const indianNativeCats = cats.filter((b) => b.indianNative).length;
  const foundInIndiaDogs = dogs.filter(
    (b) => b.foundInIndia === 'Yes' || b.foundInIndia === 'Rare'
  ).length;
  const foundInIndiaCats = cats.filter(
    (b) => b.foundInIndia === 'Yes' || b.foundInIndia === 'Rare'
  ).length;

  console.log('\nStats:');
  console.log('  Total breeds: ' + (dogs.length + cats.length));
  console.log('  Indian Native: ' + (indianNativeDogs + indianNativeCats) + ' (' + indianNativeDogs + ' dogs, ' + indianNativeCats + ' cats)');
  console.log('  Found in India: ' + (foundInIndiaDogs + foundInIndiaCats) + ' (' + foundInIndiaDogs + ' dogs, ' + foundInIndiaCats + ' cats)');
}

main();
