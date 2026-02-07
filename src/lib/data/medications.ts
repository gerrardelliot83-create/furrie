// Common veterinary medications for dogs and cats
export interface MedicationOption {
  id: string;
  name: string;
  category: string;
  commonDosages: string[];
  commonRoutes: string[];
  commonFrequencies: string[];
}

export const MEDICATIONS: MedicationOption[] = [
  // Antibiotics
  {
    id: 'amoxicillin',
    name: 'Amoxicillin',
    category: 'Antibiotics',
    commonDosages: ['10-20 mg/kg', '12.5-25 mg/kg', '22 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'amoxicillin_clavulanate',
    name: 'Amoxicillin-Clavulanic Acid (Augmentin)',
    category: 'Antibiotics',
    commonDosages: ['12.5-25 mg/kg', '13.75 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)'],
  },
  {
    id: 'cephalexin',
    name: 'Cephalexin',
    category: 'Antibiotics',
    commonDosages: ['15-30 mg/kg', '22 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'metronidazole',
    name: 'Metronidazole',
    category: 'Antibiotics',
    commonDosages: ['10-15 mg/kg', '15-25 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)'],
  },
  {
    id: 'enrofloxacin',
    name: 'Enrofloxacin (Baytril)',
    category: 'Antibiotics',
    commonDosages: ['5-10 mg/kg', '5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'doxycycline',
    name: 'Doxycycline',
    category: 'Antibiotics',
    commonDosages: ['5-10 mg/kg', '10 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'clindamycin',
    name: 'Clindamycin',
    category: 'Antibiotics',
    commonDosages: ['5.5-11 mg/kg', '11-22 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)'],
  },

  // Anti-inflammatory (NSAIDs)
  {
    id: 'meloxicam',
    name: 'Meloxicam (Metacam)',
    category: 'Anti-inflammatory',
    commonDosages: ['0.1 mg/kg', '0.2 mg/kg (loading)'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'carprofen',
    name: 'Carprofen (Rimadyl)',
    category: 'Anti-inflammatory',
    commonDosages: ['2.2 mg/kg', '4.4 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'SID (once daily)'],
  },
  {
    id: 'firocoxib',
    name: 'Firocoxib (Previcox)',
    category: 'Anti-inflammatory',
    commonDosages: ['5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },

  // Corticosteroids
  {
    id: 'prednisolone',
    name: 'Prednisolone',
    category: 'Corticosteroids',
    commonDosages: ['0.5-1 mg/kg', '1-2 mg/kg', '0.5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)', 'Every other day'],
  },
  {
    id: 'dexamethasone',
    name: 'Dexamethasone',
    category: 'Corticosteroids',
    commonDosages: ['0.1-0.2 mg/kg', '0.5-1 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['SID (once daily)'],
  },

  // Antihistamines
  {
    id: 'diphenhydramine',
    name: 'Diphenhydramine (Benadryl)',
    category: 'Antihistamines',
    commonDosages: ['1-2 mg/kg', '2-4 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine (Zyrtec)',
    category: 'Antihistamines',
    commonDosages: ['0.5-1 mg/kg', '5-10 mg per dog'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'chlorpheniramine',
    name: 'Chlorpheniramine',
    category: 'Antihistamines',
    commonDosages: ['0.2-0.4 mg/kg', '2-4 mg per cat'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },

  // Gastrointestinal
  {
    id: 'omeprazole',
    name: 'Omeprazole (Prilosec)',
    category: 'Gastrointestinal',
    commonDosages: ['0.5-1 mg/kg', '1 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'famotidine',
    name: 'Famotidine (Pepcid)',
    category: 'Gastrointestinal',
    commonDosages: ['0.5-1 mg/kg', '0.5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'ondansetron',
    name: 'Ondansetron (Zofran)',
    category: 'Gastrointestinal',
    commonDosages: ['0.5-1 mg/kg', '0.1-0.2 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'maropitant',
    name: 'Maropitant (Cerenia)',
    category: 'Gastrointestinal',
    commonDosages: ['1 mg/kg', '2 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'sucralfate',
    name: 'Sucralfate',
    category: 'Gastrointestinal',
    commonDosages: ['0.25-1 g per dose', '0.5 g per dose'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['TID (three times daily)', 'QID (four times daily)'],
  },
  {
    id: 'metoclopramide',
    name: 'Metoclopramide (Reglan)',
    category: 'Gastrointestinal',
    commonDosages: ['0.2-0.5 mg/kg', '0.4 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['TID (three times daily)', 'QID (four times daily)'],
  },

  // Antifungals
  {
    id: 'ketoconazole',
    name: 'Ketoconazole',
    category: 'Antifungals',
    commonDosages: ['5-10 mg/kg', '10 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'itraconazole',
    name: 'Itraconazole',
    category: 'Antifungals',
    commonDosages: ['5-10 mg/kg', '10 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'fluconazole',
    name: 'Fluconazole',
    category: 'Antifungals',
    commonDosages: ['5-10 mg/kg', '10 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },

  // Antiparasitics
  {
    id: 'fenbendazole',
    name: 'Fenbendazole (Panacur)',
    category: 'Antiparasitics',
    commonDosages: ['50 mg/kg', '50 mg/kg for 3-5 days'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'pyrantel',
    name: 'Pyrantel Pamoate',
    category: 'Antiparasitics',
    commonDosages: ['5-10 mg/kg', '5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['Once, repeat in 2-3 weeks'],
  },
  {
    id: 'praziquantel',
    name: 'Praziquantel',
    category: 'Antiparasitics',
    commonDosages: ['5 mg/kg', '5-10 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['Once, may repeat'],
  },
  {
    id: 'ivermectin',
    name: 'Ivermectin',
    category: 'Antiparasitics',
    commonDosages: ['0.2-0.4 mg/kg', '0.3 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['Monthly', 'Weekly for mange'],
  },

  // Cardiac
  {
    id: 'enalapril',
    name: 'Enalapril',
    category: 'Cardiac',
    commonDosages: ['0.5 mg/kg', '0.25-0.5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'furosemide',
    name: 'Furosemide (Lasix)',
    category: 'Cardiac',
    commonDosages: ['1-2 mg/kg', '2-4 mg/kg'],
    commonRoutes: ['Oral', 'Injectable'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'pimobendan',
    name: 'Pimobendan (Vetmedin)',
    category: 'Cardiac',
    commonDosages: ['0.25-0.3 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)'],
  },
  {
    id: 'atenolol',
    name: 'Atenolol',
    category: 'Cardiac',
    commonDosages: ['0.5-1 mg/kg', '6.25-12.5 mg per cat'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },

  // Behavioral/Neurological
  {
    id: 'gabapentin',
    name: 'Gabapentin',
    category: 'Behavioral/Neurological',
    commonDosages: ['5-10 mg/kg', '10-20 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)', 'TID (three times daily)'],
  },
  {
    id: 'phenobarbital',
    name: 'Phenobarbital',
    category: 'Behavioral/Neurological',
    commonDosages: ['2-3 mg/kg', '2.5-5 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['BID (twice daily)'],
  },
  {
    id: 'trazodone',
    name: 'Trazodone',
    category: 'Behavioral/Neurological',
    commonDosages: ['3-5 mg/kg', '5-10 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['As needed', 'BID (twice daily)'],
  },
  {
    id: 'fluoxetine',
    name: 'Fluoxetine (Prozac)',
    category: 'Behavioral/Neurological',
    commonDosages: ['1-2 mg/kg', '0.5-1 mg/kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },

  // Topicals
  {
    id: 'chlorhexidine_shampoo',
    name: 'Chlorhexidine Shampoo',
    category: 'Topicals',
    commonDosages: ['Apply liberally'],
    commonRoutes: ['Topical'],
    commonFrequencies: ['2-3 times weekly', 'As directed'],
  },
  {
    id: 'miconazole_shampoo',
    name: 'Miconazole Shampoo',
    category: 'Topicals',
    commonDosages: ['Apply liberally'],
    commonRoutes: ['Topical'],
    commonFrequencies: ['2-3 times weekly'],
  },
  {
    id: 'ear_cleaner',
    name: 'Ear Cleaner Solution',
    category: 'Topicals',
    commonDosages: ['Fill ear canal'],
    commonRoutes: ['Otic (Ear)'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'eye_drops_antibiotic',
    name: 'Antibiotic Eye Drops',
    category: 'Topicals',
    commonDosages: ['1-2 drops'],
    commonRoutes: ['Ophthalmic (Eye)'],
    commonFrequencies: ['TID (three times daily)', 'QID (four times daily)'],
  },

  // Supplements
  {
    id: 'omega_fatty_acids',
    name: 'Omega-3 Fatty Acids',
    category: 'Supplements',
    commonDosages: ['As per product label', '1000 mg per 10 kg'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
  {
    id: 'probiotics',
    name: 'Probiotics',
    category: 'Supplements',
    commonDosages: ['As per product label'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)', 'BID (twice daily)'],
  },
  {
    id: 'glucosamine',
    name: 'Glucosamine/Chondroitin',
    category: 'Supplements',
    commonDosages: ['As per product label'],
    commonRoutes: ['Oral'],
    commonFrequencies: ['SID (once daily)'],
  },
];

export function searchMedications(query: string): MedicationOption[] {
  const lowerQuery = query.toLowerCase();
  return MEDICATIONS.filter(
    (med) =>
      med.name.toLowerCase().includes(lowerQuery) ||
      med.category.toLowerCase().includes(lowerQuery)
  );
}

export function getMedicationsByCategory(category: string): MedicationOption[] {
  return MEDICATIONS.filter((med) => med.category === category);
}

export const MEDICATION_CATEGORIES = [
  'Antibiotics',
  'Anti-inflammatory',
  'Corticosteroids',
  'Antihistamines',
  'Gastrointestinal',
  'Antifungals',
  'Antiparasitics',
  'Cardiac',
  'Behavioral/Neurological',
  'Topicals',
  'Supplements',
];

export const COMMON_DURATIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '30 days',
  'Until finished',
  'Until follow-up',
  'Ongoing',
];
