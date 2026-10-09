// Run: npx tsx --test "src/**/__tests__/*.test.ts"
// HF2: a pet without a date of birth could not be saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Pet } from '@/types';
import { emptyToNull, mapPetToDB, mapPetUpdateToDB } from '../petMapper';

const base: Partial<Pet> = { name: 'Bruno', species: 'dog', breed: 'Indie', gender: 'male' };

test('empty form fields become null; real values (including 0) are kept', () => {
  assert.equal(emptyToNull(''), null);
  assert.equal(emptyToNull(undefined), null);
  assert.equal(emptyToNull(null), null);
  assert.equal(emptyToNull(0), 0);
  assert.equal(emptyToNull('2024-01-31'), '2024-01-31');
});

test('a new pet with the date of birth left empty is saved with null, not ""', () => {
  const row = mapPetToDB(
    { ...base, dateOfBirth: '', approximateAgeMonths: '' as unknown as number, weightKg: '' as unknown as number },
    'owner-1'
  );
  assert.equal(row.date_of_birth, null);
  assert.equal(row.approximate_age_months, null);
  assert.equal(row.weight_kg, null);
});

test('a new pet keeps a real date of birth, age and weight', () => {
  const row = mapPetToDB({ ...base, dateOfBirth: '2024-01-31', approximateAgeMonths: 0, weightKg: 12.5 }, 'owner-1');
  assert.equal(row.date_of_birth, '2024-01-31');
  assert.equal(row.approximate_age_months, 0);
  assert.equal(row.weight_kg, 12.5);
});

test('editing a pet whose date of birth is unknown no longer sends ""', () => {
  const update = mapPetUpdateToDB({ dateOfBirth: '', approximateAgeMonths: 18 });
  assert.equal(update.date_of_birth, null);
  assert.equal(update.approximate_age_months, 18);
  assert.equal('weight_kg' in update, false);
});
