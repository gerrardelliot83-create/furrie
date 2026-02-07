'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { hasSevereSymptoms } from '@/lib/data/symptoms';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
  StepIndicator,
  PetSelector,
  SymptomChips,
  EmergencyDisclaimer,
  ConsultationSummary,
  MatchingScreen,
} from '@/components/consultation';
import styles from './ConnectFlow.module.css';

type FlowStep = 'select-pet' | 'describe-concern' | 'review' | 'matching';

interface ConnectFlowProps {
  initialPets: Pet[];
}

export function ConnectFlow({ initialPets }: ConnectFlowProps) {
  const tCommon = useTranslations('common');
  const router = useRouter();

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('select-pet');
  const [pets] = useState<Pet[]>(initialPets);

  // Form data
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    initialPets.length === 1 ? initialPets[0].id : null
  );
  const [concernText, setConcernText] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const showEmergencyWarning = hasSevereSymptoms(symptoms);

  // Step number for indicator
  const stepNumber = {
    'select-pet': 1,
    'describe-concern': 2,
    'review': 3,
    'matching': 4,
  }[currentStep];

  const stepLabels = ['Pet', 'Concern', 'Review', 'Connect'];

  // Navigation handlers
  const goToStep = (step: FlowStep) => {
    setError(null);
    setCurrentStep(step);
  };

  const handlePetSelect = (petId: string) => {
    setSelectedPetId(petId);
  };

  const handleAddPet = () => {
    router.push('/pets/new?returnTo=/connect');
  };

  const handleContinueFromPet = () => {
    if (!selectedPetId) {
      setError('Please select a pet');
      return;
    }
    goToStep('describe-concern');
  };

  const handleContinueFromConcern = () => {
    if (!concernText.trim() && symptoms.length === 0) {
      setError('Please describe the concern or select at least one symptom');
      return;
    }
    goToStep('review');
  };

  const handleSubmitConsultation = async () => {
    if (!selectedPetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: selectedPetId,
          concernText: concernText.trim() || null,
          symptomCategories: symptoms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create consultation');
      }

      setConsultationId(data.consultation.id);
      goToStep('matching');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMatching = async () => {
    if (consultationId) {
      try {
        await fetch(`/api/consultations/${consultationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch {
        // Ignore cancel errors
      }
    }

    // Reset flow
    setConsultationId(null);
    goToStep('select-pet');
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'select-pet':
        return (
          <div className={styles.stepContent}>
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              onSelect={handlePetSelect}
              onAddPet={handleAddPet}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={handleContinueFromPet}
                disabled={!selectedPetId}
                fullWidth
              >
                {tCommon('next')}
              </Button>
            </div>
          </div>
        );

      case 'describe-concern':
        return (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>
              What&apos;s going on with {selectedPet?.name}?
            </h2>
            <p className={styles.stepSubtitle}>
              Describe the issue and select any symptoms
            </p>

            <div className={styles.formGroup}>
              <Textarea
                name="concern"
                placeholder="Describe what's happening with your pet in your own words..."
                value={concernText}
                onChange={(e) => setConcernText(e.target.value)}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Select symptoms (optional)</label>
              <SymptomChips
                selected={symptoms}
                onChange={setSymptoms}
              />
            </div>

            <EmergencyDisclaimer
              petName={selectedPet?.name || 'your pet'}
              visible={showEmergencyWarning}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => goToStep('select-pet')}>
                {tCommon('back')}
              </Button>
              <Button
                variant="primary"
                onClick={handleContinueFromConcern}
                disabled={!concernText.trim() && symptoms.length === 0}
              >
                {tCommon('next')}
              </Button>
            </div>
          </div>
        );

      case 'review':
        if (!selectedPet) return null;
        return (
          <div className={styles.stepContent}>
            <ConsultationSummary
              pet={selectedPet}
              concernText={concernText}
              symptoms={symptoms}
              isPlusUser={false} // TODO: Phase 5 - Check subscription
              onSubmit={handleSubmitConsultation}
              onBack={() => goToStep('describe-concern')}
              loading={loading}
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>
        );

      case 'matching':
        return (
          <MatchingScreen
            petName={selectedPet?.name || 'your pet'}
            onCancel={handleCancelMatching}
            consultationId={consultationId || undefined}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {currentStep !== 'matching' && (
        <StepIndicator
          currentStep={stepNumber}
          totalSteps={4}
          labels={stepLabels}
          className={styles.indicator}
        />
      )}

      <div className={styles.content}>
        {renderStep()}
      </div>
    </div>
  );
}
