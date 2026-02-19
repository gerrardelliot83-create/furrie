'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Pet, Medication, VaccinationRecord } from '@/types';
import { usePets } from '@/hooks/usePets';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { TagInput } from './TagInput';
import { BreedSelect } from './BreedSelect';
import { PetPhotoUpload } from './PetPhotoUpload';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';
import styles from './PetForm.module.css';

interface PetFormProps {
  pet?: Pet;
  mode: 'create' | 'edit';
  className?: string;
}

interface FormErrors {
  name?: string;
  species?: string;
  breed?: string;
  gender?: string;
  dateOfBirth?: string;
  weightKg?: string;
}

const DIET_OPTIONS = [
  { value: '', label: 'Select diet type' },
  { value: 'home-cooked', label: 'Home-cooked' },
  { value: 'dry', label: 'Dry food (Kibble)' },
  { value: 'wet', label: 'Wet food (Canned)' },
  { value: 'raw', label: 'Raw diet' },
  { value: 'mixed', label: 'Mixed diet' },
];

export function PetForm({ pet, mode, className }: PetFormProps) {
  const router = useRouter();
  const t = useTranslations('pets');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');
  const { createPet, updatePet, loading } = usePets();
  const { success, error: showError } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<Pet>>({
    name: pet?.name || '',
    species: pet?.species || 'dog',
    breed: pet?.breed || '',
    gender: pet?.gender || 'male',
    dateOfBirth: pet?.dateOfBirth || '',
    approximateAgeMonths: pet?.approximateAgeMonths || null,
    weightKg: pet?.weightKg || null,
    isNeutered: pet?.isNeutered || false,
    colorMarkings: pet?.colorMarkings || '',
    microchipNumber: pet?.microchipNumber || '',
    knownAllergies: pet?.knownAllergies || [],
    existingConditions: pet?.existingConditions || [],
    currentMedications: pet?.currentMedications || [],
    dietType: pet?.dietType || '',
    dietDetails: pet?.dietDetails || '',
    vaccinationHistory: pet?.vaccinationHistory || [],
    photoUrls: pet?.photoUrls || [],
    medicalDocsUrls: pet?.medicalDocsUrls || [],
    insuranceProvider: pet?.insuranceProvider || '',
    insurancePolicyNumber: pet?.insurancePolicyNumber || '',
  });

  const isDirtyRef = useRef(false);

  // Track unsaved changes for beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const [errors, setErrors] = useState<FormErrors>({});
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    health: mode === 'create' ? false : true,
    medical: mode === 'create' ? false : true,
    other: mode === 'create' ? false : true,
  });
  const [hasInsurance, setHasInsurance] = useState(
    !!(pet?.insuranceProvider || pet?.insurancePolicyNumber)
  );

  // Medication state for adding new medications
  const [newMedication, setNewMedication] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: '',
  });

  // Vaccination state for adding new vaccinations
  const [newVaccination, setNewVaccination] = useState<Omit<VaccinationRecord, 'status'>>({
    name: '',
    date: '',
    nextDueDate: '',
    administeredBy: '',
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const updateFormData = useCallback(
    <K extends keyof Partial<Pet>>(key: K, value: Pet[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      isDirtyRef.current = true;
      if (errors[key as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      if (type === 'checkbox') {
        updateFormData(name as keyof Pet, checked as Pet[keyof Pet]);
      } else if (type === 'number') {
        updateFormData(name as keyof Pet, value ? parseFloat(value) : null as Pet[keyof Pet]);
      } else {
        updateFormData(name as keyof Pet, value as Pet[keyof Pet]);
      }
    },
    [updateFormData]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = tValidation('required');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = tValidation('minLength', { min: 2 });
    } else if (formData.name.trim().length > 50) {
      newErrors.name = tValidation('maxLength', { max: 50 });
    }

    if (!formData.species) {
      newErrors.species = tValidation('required');
    }

    if (!formData.breed) {
      newErrors.breed = tValidation('required');
    }

    if (!formData.gender) {
      newErrors.gender = tValidation('required');
    }

    if (formData.weightKg !== null && formData.weightKg !== undefined) {
      if (formData.weightKg <= 0 || formData.weightKg > 200) {
        newErrors.weightKg = 'Weight must be between 0.1 and 200 kg';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, tValidation]);

  const handleAddMedication = useCallback(() => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim()) return;

    updateFormData('currentMedications', [
      ...(formData.currentMedications || []),
      { ...newMedication },
    ]);

    setNewMedication({ name: '', dosage: '', frequency: '' });
  }, [newMedication, formData.currentMedications, updateFormData]);

  const handleRemoveMedication = useCallback(
    (index: number) => {
      updateFormData(
        'currentMedications',
        formData.currentMedications?.filter((_, i) => i !== index) || []
      );
    },
    [formData.currentMedications, updateFormData]
  );

  const [vaccinationDateError, setVaccinationDateError] = useState('');

  const handleAddVaccination = useCallback(() => {
    if (!newVaccination.name.trim() || !newVaccination.date) return;

    // Validate that next due date is after date given
    if (newVaccination.nextDueDate && newVaccination.date) {
      if (newVaccination.nextDueDate <= newVaccination.date) {
        setVaccinationDateError('Next due date must be after the date given');
        return;
      }
    }
    setVaccinationDateError('');

    const vaccination: VaccinationRecord = {
      ...newVaccination,
      status: 'pending_approval',
    };

    updateFormData('vaccinationHistory', [
      ...(formData.vaccinationHistory || []),
      vaccination,
    ]);

    setNewVaccination({ name: '', date: '', nextDueDate: '', administeredBy: '' });
  }, [newVaccination, formData.vaccinationHistory, updateFormData]);

  const handleRemoveVaccination = useCallback(
    (index: number) => {
      updateFormData(
        'vaccinationHistory',
        formData.vaccinationHistory?.filter((_, i) => i !== index) || []
      );
    },
    [formData.vaccinationHistory, updateFormData]
  );

  const handleMedicalDocsUpload = useCallback(
    (urls: string[]) => {
      updateFormData('medicalDocsUrls', [
        ...(formData.medicalDocsUrls || []),
        ...urls,
      ]);
    },
    [formData.medicalDocsUrls, updateFormData]
  );

  const handleRemoveMedicalDoc = useCallback(
    (index: number) => {
      updateFormData(
        'medicalDocsUrls',
        formData.medicalDocsUrls?.filter((_, i) => i !== index) || []
      );
    },
    [formData.medicalDocsUrls, updateFormData]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      // Clean up data before submission
      const dataToSubmit: Partial<Pet> = {
        ...formData,
        name: formData.name?.trim(),
        colorMarkings: formData.colorMarkings?.trim() || null,
        microchipNumber: formData.microchipNumber?.trim() || null,
        dietType: formData.dietType || null,
        dietDetails: formData.dietDetails?.trim() || null,
        insuranceProvider: hasInsurance ? formData.insuranceProvider?.trim() || null : null,
        insurancePolicyNumber: hasInsurance ? formData.insurancePolicyNumber?.trim() || null : null,
      };

      if (mode === 'create') {
        const { pet: newPet, error } = await createPet(dataToSubmit);
        if (error) {
          showError(error);
        } else if (newPet) {
          isDirtyRef.current = false;
          success('Pet added successfully');
          router.push(`/pets/${newPet.id}`);
        }
      } else if (pet) {
        const { pet: updatedPet, error } = await updatePet(pet.id, dataToSubmit);
        if (error) {
          showError(error);
        } else if (updatedPet) {
          isDirtyRef.current = false;
          success('Pet updated successfully');
          router.push(`/pets/${updatedPet.id}`);
        }
      }
    },
    [formData, hasInsurance, mode, pet, validateForm, createPet, updatePet, router, success, showError]
  );

  return (
    <form onSubmit={handleSubmit} className={cn(styles.form, className)}>
      {/* Basic Info Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => toggleSection('basic')}
          aria-expanded={expandedSections.basic}
        >
          <span className={styles.sectionTitle}>Basic Information</span>
          <svg
            className={cn(styles.chevron, expandedSections.basic && styles.chevronOpen)}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {expandedSections.basic && (
          <div className={styles.sectionContent}>
            <PetPhotoUpload
              label={t('photos')}
              value={formData.photoUrls || []}
              onChange={(urls) => updateFormData('photoUrls', urls)}
              maxPhotos={5}
              helperText="First photo will be your pet's profile picture"
            />

            <Input
              label={t('name')}
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="Enter your pet's name"
              required
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('species')}</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="species"
                    value="dog"
                    checked={formData.species === 'dog'}
                    onChange={handleInputChange}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioText}>{t('dog')}</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="species"
                    value="cat"
                    checked={formData.species === 'cat'}
                    onChange={handleInputChange}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioText}>{t('cat')}</span>
                </label>
              </div>
              {errors.species && (
                <span className={styles.errorText}>{errors.species}</span>
              )}
            </div>

            <BreedSelect
              label={t('breed')}
              value={formData.breed || ''}
              onChange={(breed) => updateFormData('breed', breed)}
              species={formData.species || 'dog'}
              error={errors.breed}
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('gender')}</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === 'male'}
                    onChange={handleInputChange}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioText}>{t('male')}</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === 'female'}
                    onChange={handleInputChange}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioText}>{t('female')}</span>
                </label>
              </div>
              {errors.gender && (
                <span className={styles.errorText}>{errors.gender}</span>
              )}
            </div>

            <div className={styles.row}>
              <Input
                label={t('dateOfBirth')}
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={handleInputChange}
                error={errors.dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                helperText="Leave empty if unknown"
              />
              <Input
                label={t('approximateAge')}
                name="approximateAgeMonths"
                type="number"
                value={formData.approximateAgeMonths?.toString() || ''}
                onChange={handleInputChange}
                placeholder="Months"
                helperText="If DOB is unknown"
                min={0}
                max={360}
              />
            </div>

            <div className={styles.row}>
              <Input
                label={t('weight')}
                name="weightKg"
                type="number"
                value={formData.weightKg?.toString() || ''}
                onChange={handleInputChange}
                error={errors.weightKg}
                placeholder="0.0"
                step="0.1"
                min="0.1"
                max="200"
              />
              <Input
                label={t('color')}
                name="colorMarkings"
                value={formData.colorMarkings || ''}
                onChange={handleInputChange}
                placeholder="e.g., Golden, Black & White"
              />
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isNeutered"
                checked={formData.isNeutered || false}
                onChange={handleInputChange}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>{t('isNeutered')}</span>
            </label>
          </div>
        )}
      </section>

      {/* Health Info Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => toggleSection('health')}
          aria-expanded={expandedSections.health}
        >
          <span className={styles.sectionTitle}>Health Information</span>
          <svg
            className={cn(styles.chevron, expandedSections.health && styles.chevronOpen)}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {expandedSections.health && (
          <div className={styles.sectionContent}>
            <TagInput
              label={t('allergies')}
              value={formData.knownAllergies || []}
              onChange={(tags) => updateFormData('knownAllergies', tags)}
              placeholder="Type allergy and press Enter..."
              helperText="e.g., Chicken, Pollen, Dust mites"
            />

            <TagInput
              label={t('conditions')}
              value={formData.existingConditions || []}
              onChange={(tags) => updateFormData('existingConditions', tags)}
              placeholder="Type condition and press Enter..."
              helperText="e.g., Hip Dysplasia, Diabetes"
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('medications')}</label>
              {(formData.currentMedications || []).length > 0 && (
                <div className={styles.medicationList}>
                  {formData.currentMedications?.map((med, index) => (
                    <div key={index} className={styles.medicationItem}>
                      <div className={styles.medicationInfo}>
                        <span className={styles.medicationName}>{med.name}</span>
                        <span className={styles.medicationDetails}>
                          {med.dosage} - {med.frequency}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => handleRemoveMedication(index)}
                        aria-label="Remove medication"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.addMedicationForm}>
                <Input
                  placeholder="Medication name"
                  value={newMedication.name}
                  onChange={(e) =>
                    setNewMedication((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Dosage"
                  value={newMedication.dosage}
                  onChange={(e) =>
                    setNewMedication((prev) => ({ ...prev, dosage: e.target.value }))
                  }
                />
                <Input
                  placeholder="Frequency"
                  value={newMedication.frequency}
                  onChange={(e) =>
                    setNewMedication((prev) => ({ ...prev, frequency: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMedication}
                  disabled={!newMedication.name || !newMedication.dosage}
                >
                  Add
                </Button>
              </div>
            </div>

            <Input
              label={t('microchip')}
              name="microchipNumber"
              value={formData.microchipNumber || ''}
              onChange={handleInputChange}
              placeholder="e.g., 985112000000000"
            />
          </div>
        )}
      </section>

      {/* Medical Records Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => toggleSection('medical')}
          aria-expanded={expandedSections.medical}
        >
          <span className={styles.sectionTitle}>Medical Records</span>
          <svg
            className={cn(styles.chevron, expandedSections.medical && styles.chevronOpen)}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {expandedSections.medical && (
          <div className={styles.sectionContent}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('vaccinations')}</label>
              <p className={styles.fieldHint}>
                Vaccination records added here will be marked as pending and require vet verification.
              </p>
              {(formData.vaccinationHistory || []).length > 0 && (
                <div className={styles.vaccinationList}>
                  {formData.vaccinationHistory?.map((vax, index) => (
                    <div key={index} className={styles.vaccinationItem}>
                      <div className={styles.vaccinationInfo}>
                        <div className={styles.vaccinationHeader}>
                          <span className={styles.vaccinationName}>{vax.name}</span>
                          {vax.status === 'pending_approval' && (
                            <span className={styles.pendingBadge}>Pending</span>
                          )}
                          {vax.status === 'approved' && (
                            <span className={styles.approvedBadge}>Verified</span>
                          )}
                        </div>
                        <span className={styles.vaccinationDate}>
                          Given: {new Date(vax.date).toLocaleDateString('en-IN')}
                          {vax.nextDueDate && (
                            <> | Due: {new Date(vax.nextDueDate).toLocaleDateString('en-IN')}</>
                          )}
                        </span>
                      </div>
                      {vax.status === 'pending_approval' && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemoveVaccination(index)}
                          aria-label="Remove vaccination"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.addVaccinationForm}>
                <Input
                  placeholder="Vaccine name"
                  value={newVaccination.name}
                  onChange={(e) =>
                    setNewVaccination((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  placeholder="Date given"
                  value={newVaccination.date}
                  onChange={(e) =>
                    setNewVaccination((prev) => ({ ...prev, date: e.target.value }))
                  }
                  max={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="date"
                  placeholder="Next due date"
                  value={newVaccination.nextDueDate}
                  onChange={(e) =>
                    setNewVaccination((prev) => ({ ...prev, nextDueDate: e.target.value }))
                  }
                />
                <Input
                  placeholder="Administered by"
                  value={newVaccination.administeredBy}
                  onChange={(e) =>
                    setNewVaccination((prev) => ({ ...prev, administeredBy: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddVaccination}
                  disabled={!newVaccination.name || !newVaccination.date}
                >
                  Add
                </Button>
              </div>
              {vaccinationDateError && (
                <span className={styles.errorText}>{vaccinationDateError}</span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('medicalDocs')}</label>
              {(formData.medicalDocsUrls || []).length > 0 && (
                <div className={styles.docList}>
                  {formData.medicalDocsUrls?.map((url, index) => (
                    <div key={index} className={styles.docItem}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className={styles.docName}>Document {index + 1}</span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => handleRemoveMedicalDoc(index)}
                        aria-label="Remove document"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FileUpload
                endpoint="medicalDocument"
                onUploadComplete={handleMedicalDocsUpload}
                maxFiles={5}
              />
            </div>
          </div>
        )}
      </section>

      {/* Other Info Section */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.sectionHeader}
          onClick={() => toggleSection('other')}
          aria-expanded={expandedSections.other}
        >
          <span className={styles.sectionTitle}>Other Information</span>
          <svg
            className={cn(styles.chevron, expandedSections.other && styles.chevronOpen)}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {expandedSections.other && (
          <div className={styles.sectionContent}>
            <Select
              label={t('diet')}
              name="dietType"
              value={formData.dietType || ''}
              onChange={handleInputChange}
              options={DIET_OPTIONS}
            />

            <Textarea
              label="Diet Details"
              name="dietDetails"
              value={formData.dietDetails || ''}
              onChange={handleInputChange}
              placeholder="Describe your pet's diet, feeding schedule, favorite foods..."
              rows={3}
            />

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={hasInsurance}
                onChange={(e) => setHasInsurance(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>Has pet insurance</span>
            </label>

            {hasInsurance && (
              <div className={styles.row}>
                <Input
                  label="Insurance Provider"
                  name="insuranceProvider"
                  value={formData.insuranceProvider || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., ICICI Lombard"
                />
                <Input
                  label="Policy Number"
                  name="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., PET123456789"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Submit Button */}
      <div className={styles.submitWrapper}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            isDirtyRef.current = false;
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/pets');
            }
          }}
          disabled={loading}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {mode === 'create' ? t('addPet') : tCommon('save')}
        </Button>
      </div>
    </form>
  );
}
