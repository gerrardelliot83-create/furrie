// Common veterinary diagnoses for dogs and cats
export interface DiagnosisOption {
  id: string;
  name: string;
  category: string;
  species: 'dog' | 'cat' | 'both';
}

export const DIAGNOSES: DiagnosisOption[] = [
  // Gastrointestinal
  { id: 'gastritis', name: 'Gastritis', category: 'Gastrointestinal', species: 'both' },
  { id: 'gastroenteritis', name: 'Gastroenteritis', category: 'Gastrointestinal', species: 'both' },
  { id: 'pancreatitis', name: 'Pancreatitis', category: 'Gastrointestinal', species: 'both' },
  { id: 'ibd', name: 'Inflammatory Bowel Disease (IBD)', category: 'Gastrointestinal', species: 'both' },
  { id: 'colitis', name: 'Colitis', category: 'Gastrointestinal', species: 'both' },
  { id: 'constipation', name: 'Constipation', category: 'Gastrointestinal', species: 'both' },
  { id: 'intestinal_parasites', name: 'Intestinal Parasites', category: 'Gastrointestinal', species: 'both' },
  { id: 'gi_foreign_body', name: 'GI Foreign Body', category: 'Gastrointestinal', species: 'both' },
  { id: 'megaesophagus', name: 'Megaesophagus', category: 'Gastrointestinal', species: 'dog' },
  { id: 'hemorrhagic_gastroenteritis', name: 'Hemorrhagic Gastroenteritis (HGE)', category: 'Gastrointestinal', species: 'dog' },

  // Dermatological
  { id: 'atopic_dermatitis', name: 'Atopic Dermatitis', category: 'Dermatological', species: 'both' },
  { id: 'flea_allergy_dermatitis', name: 'Flea Allergy Dermatitis', category: 'Dermatological', species: 'both' },
  { id: 'food_allergy', name: 'Food Allergy/Hypersensitivity', category: 'Dermatological', species: 'both' },
  { id: 'pyoderma', name: 'Pyoderma (Bacterial Skin Infection)', category: 'Dermatological', species: 'both' },
  { id: 'hot_spots', name: 'Hot Spots (Acute Moist Dermatitis)', category: 'Dermatological', species: 'dog' },
  { id: 'ringworm', name: 'Ringworm (Dermatophytosis)', category: 'Dermatological', species: 'both' },
  { id: 'demodex', name: 'Demodex Mange', category: 'Dermatological', species: 'both' },
  { id: 'sarcoptic_mange', name: 'Sarcoptic Mange', category: 'Dermatological', species: 'dog' },
  { id: 'seborrhea', name: 'Seborrhea', category: 'Dermatological', species: 'both' },
  { id: 'yeast_dermatitis', name: 'Yeast Dermatitis (Malassezia)', category: 'Dermatological', species: 'both' },
  { id: 'ear_mites', name: 'Ear Mites (Otodectes)', category: 'Dermatological', species: 'both' },
  { id: 'feline_acne', name: 'Feline Acne', category: 'Dermatological', species: 'cat' },
  { id: 'eosinophilic_granuloma', name: 'Eosinophilic Granuloma Complex', category: 'Dermatological', species: 'cat' },

  // Ear/Eye
  { id: 'otitis_externa', name: 'Otitis Externa', category: 'Ear/Eye', species: 'both' },
  { id: 'otitis_media', name: 'Otitis Media', category: 'Ear/Eye', species: 'both' },
  { id: 'conjunctivitis', name: 'Conjunctivitis', category: 'Ear/Eye', species: 'both' },
  { id: 'keratitis', name: 'Keratitis', category: 'Ear/Eye', species: 'both' },
  { id: 'corneal_ulcer', name: 'Corneal Ulcer', category: 'Ear/Eye', species: 'both' },
  { id: 'dry_eye', name: 'Keratoconjunctivitis Sicca (Dry Eye)', category: 'Ear/Eye', species: 'both' },
  { id: 'cherry_eye', name: 'Cherry Eye', category: 'Ear/Eye', species: 'dog' },
  { id: 'glaucoma', name: 'Glaucoma', category: 'Ear/Eye', species: 'both' },
  { id: 'cataracts', name: 'Cataracts', category: 'Ear/Eye', species: 'both' },
  { id: 'uveitis', name: 'Uveitis', category: 'Ear/Eye', species: 'both' },

  // Respiratory
  { id: 'kennel_cough', name: 'Kennel Cough (Infectious Tracheobronchitis)', category: 'Respiratory', species: 'dog' },
  { id: 'upper_respiratory_infection', name: 'Upper Respiratory Infection', category: 'Respiratory', species: 'both' },
  { id: 'feline_asthma', name: 'Feline Asthma', category: 'Respiratory', species: 'cat' },
  { id: 'bronchitis', name: 'Chronic Bronchitis', category: 'Respiratory', species: 'both' },
  { id: 'pneumonia', name: 'Pneumonia', category: 'Respiratory', species: 'both' },
  { id: 'tracheal_collapse', name: 'Tracheal Collapse', category: 'Respiratory', species: 'dog' },
  { id: 'brachycephalic_syndrome', name: 'Brachycephalic Obstructive Airway Syndrome', category: 'Respiratory', species: 'dog' },
  { id: 'laryngeal_paralysis', name: 'Laryngeal Paralysis', category: 'Respiratory', species: 'dog' },

  // Urinary
  { id: 'uti', name: 'Urinary Tract Infection (UTI)', category: 'Urinary', species: 'both' },
  { id: 'flutd', name: 'Feline Lower Urinary Tract Disease (FLUTD)', category: 'Urinary', species: 'cat' },
  { id: 'urinary_crystals', name: 'Urinary Crystals/Stones', category: 'Urinary', species: 'both' },
  { id: 'cystitis', name: 'Cystitis', category: 'Urinary', species: 'both' },
  { id: 'urinary_obstruction', name: 'Urinary Obstruction', category: 'Urinary', species: 'both' },
  { id: 'chronic_kidney_disease', name: 'Chronic Kidney Disease (CKD)', category: 'Urinary', species: 'both' },
  { id: 'acute_kidney_injury', name: 'Acute Kidney Injury', category: 'Urinary', species: 'both' },
  { id: 'incontinence', name: 'Urinary Incontinence', category: 'Urinary', species: 'both' },

  // Endocrine
  { id: 'diabetes_mellitus', name: 'Diabetes Mellitus', category: 'Endocrine', species: 'both' },
  { id: 'hypothyroidism', name: 'Hypothyroidism', category: 'Endocrine', species: 'dog' },
  { id: 'hyperthyroidism', name: 'Hyperthyroidism', category: 'Endocrine', species: 'cat' },
  { id: 'cushings', name: "Cushing's Disease (Hyperadrenocorticism)", category: 'Endocrine', species: 'dog' },
  { id: 'addisons', name: "Addison's Disease (Hypoadrenocorticism)", category: 'Endocrine', species: 'dog' },

  // Cardiac
  { id: 'heart_murmur', name: 'Heart Murmur', category: 'Cardiac', species: 'both' },
  { id: 'mitral_valve_disease', name: 'Mitral Valve Disease (MVD)', category: 'Cardiac', species: 'dog' },
  { id: 'dcm', name: 'Dilated Cardiomyopathy (DCM)', category: 'Cardiac', species: 'both' },
  { id: 'hcm', name: 'Hypertrophic Cardiomyopathy (HCM)', category: 'Cardiac', species: 'cat' },
  { id: 'chf', name: 'Congestive Heart Failure (CHF)', category: 'Cardiac', species: 'both' },
  { id: 'arrhythmia', name: 'Cardiac Arrhythmia', category: 'Cardiac', species: 'both' },

  // Orthopedic
  { id: 'osteoarthritis', name: 'Osteoarthritis/Degenerative Joint Disease', category: 'Orthopedic', species: 'both' },
  { id: 'hip_dysplasia', name: 'Hip Dysplasia', category: 'Orthopedic', species: 'dog' },
  { id: 'elbow_dysplasia', name: 'Elbow Dysplasia', category: 'Orthopedic', species: 'dog' },
  { id: 'cruciate_disease', name: 'Cranial Cruciate Ligament Disease', category: 'Orthopedic', species: 'dog' },
  { id: 'patellar_luxation', name: 'Patellar Luxation', category: 'Orthopedic', species: 'both' },
  { id: 'ivdd', name: 'Intervertebral Disc Disease (IVDD)', category: 'Orthopedic', species: 'dog' },
  { id: 'fracture', name: 'Fracture', category: 'Orthopedic', species: 'both' },
  { id: 'sprain_strain', name: 'Sprain/Strain', category: 'Orthopedic', species: 'both' },

  // Dental
  { id: 'periodontal_disease', name: 'Periodontal Disease', category: 'Dental', species: 'both' },
  { id: 'gingivitis', name: 'Gingivitis', category: 'Dental', species: 'both' },
  { id: 'tooth_resorption', name: 'Feline Tooth Resorption', category: 'Dental', species: 'cat' },
  { id: 'dental_abscess', name: 'Dental Abscess', category: 'Dental', species: 'both' },
  { id: 'stomatitis', name: 'Stomatitis', category: 'Dental', species: 'both' },

  // Behavioral
  { id: 'anxiety', name: 'Anxiety Disorder', category: 'Behavioral', species: 'both' },
  { id: 'separation_anxiety', name: 'Separation Anxiety', category: 'Behavioral', species: 'dog' },
  { id: 'noise_phobia', name: 'Noise Phobia', category: 'Behavioral', species: 'both' },
  { id: 'aggression', name: 'Aggression', category: 'Behavioral', species: 'both' },
  { id: 'cognitive_dysfunction', name: 'Cognitive Dysfunction Syndrome', category: 'Behavioral', species: 'both' },
  { id: 'compulsive_disorder', name: 'Compulsive Disorder', category: 'Behavioral', species: 'both' },

  // Infectious Diseases
  { id: 'parvovirus', name: 'Canine Parvovirus', category: 'Infectious', species: 'dog' },
  { id: 'distemper', name: 'Canine Distemper', category: 'Infectious', species: 'dog' },
  { id: 'fiv', name: 'Feline Immunodeficiency Virus (FIV)', category: 'Infectious', species: 'cat' },
  { id: 'felv', name: 'Feline Leukemia Virus (FeLV)', category: 'Infectious', species: 'cat' },
  { id: 'fip', name: 'Feline Infectious Peritonitis (FIP)', category: 'Infectious', species: 'cat' },
  { id: 'leptospirosis', name: 'Leptospirosis', category: 'Infectious', species: 'dog' },
  { id: 'tick_fever', name: 'Tick-borne Disease (Ehrlichia/Babesia)', category: 'Infectious', species: 'dog' },

  // Other
  { id: 'obesity', name: 'Obesity', category: 'Other', species: 'both' },
  { id: 'anemia', name: 'Anemia', category: 'Other', species: 'both' },
  { id: 'immune_mediated_disease', name: 'Immune-Mediated Disease', category: 'Other', species: 'both' },
  { id: 'toxicity', name: 'Toxicity/Poisoning', category: 'Other', species: 'both' },
  { id: 'heatstroke', name: 'Heatstroke', category: 'Other', species: 'both' },
  { id: 'neoplasia', name: 'Neoplasia (Cancer)', category: 'Other', species: 'both' },
  { id: 'epilepsy', name: 'Epilepsy/Seizure Disorder', category: 'Other', species: 'both' },
  { id: 'hepatic_disease', name: 'Hepatic Disease', category: 'Other', species: 'both' },
];

export function searchDiagnoses(query: string, species?: 'dog' | 'cat'): DiagnosisOption[] {
  const lowerQuery = query.toLowerCase();
  return DIAGNOSES.filter((diagnosis) => {
    const matchesQuery =
      diagnosis.name.toLowerCase().includes(lowerQuery) ||
      diagnosis.category.toLowerCase().includes(lowerQuery);
    const matchesSpecies = !species || diagnosis.species === 'both' || diagnosis.species === species;
    return matchesQuery && matchesSpecies;
  });
}

export function getDiagnosesByCategory(category: string, species?: 'dog' | 'cat'): DiagnosisOption[] {
  return DIAGNOSES.filter((diagnosis) => {
    const matchesCategory = diagnosis.category === category;
    const matchesSpecies = !species || diagnosis.species === 'both' || diagnosis.species === species;
    return matchesCategory && matchesSpecies;
  });
}

export const DIAGNOSIS_CATEGORIES = [
  'Gastrointestinal',
  'Dermatological',
  'Ear/Eye',
  'Respiratory',
  'Urinary',
  'Endocrine',
  'Cardiac',
  'Orthopedic',
  'Dental',
  'Behavioral',
  'Infectious',
  'Other',
];
