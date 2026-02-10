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
  TimeSlotSelector,
  BookingConfirmation,
} from '@/components/consultation';
import styles from './ConnectFlow.module.css';

type FlowStep = 'select-pet' | 'describe-concern' | 'select-time' | 'review' | 'confirmation';

interface TimeSlot {
  start: string;
  end: string;
  datetime: string;
}

interface BookedConsultation {
  id: string;
  consultationNumber: string;
  scheduledAt: string;
  petName: string;
  vetName: string | null;
}

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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedConsultation, setBookedConsultation] = useState<BookedConsultation | null>(null);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const showEmergencyWarning = hasSevereSymptoms(symptoms);

  // Step number for indicator (5 steps now)
  const stepNumber = {
    'select-pet': 1,
    'describe-concern': 2,
    'select-time': 3,
    'review': 4,
    'confirmation': 5,
  }[currentStep];

  const stepLabels = ['Pet', 'Concern', 'Time', 'Pay', 'Done'];

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
    goToStep('select-time');
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    goToStep('review');
  };

  const handleBookAndPay = async () => {
    if (!selectedPetId || !selectedTimeSlot) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Book the consultation slot
      const bookResponse = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: selectedPetId,
          scheduledAt: selectedTimeSlot.datetime,
          concernText: concernText.trim() || null,
          symptomCategories: symptoms,
        }),
      });

      const bookData = await bookResponse.json();

      if (!bookResponse.ok) {
        throw new Error(bookData.error || 'Failed to book consultation');
      }

      // Step 2: Create payment order
      const paymentResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: bookData.consultation.id,
          amount: bookData.payment.amount,
          currency: bookData.payment.currency,
          description: bookData.payment.description,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || 'Failed to create payment order');
      }

      // In dev mode (SKIP_PAYMENTS=true), payment is auto-completed
      if (paymentData.devMode) {
        // Update consultation status to scheduled
        await fetch(`/api/consultations/${bookData.consultation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'scheduled' }),
        });

        // Show confirmation
        setBookedConsultation({
          id: bookData.consultation.id,
          consultationNumber: bookData.consultation.consultationNumber,
          scheduledAt: bookData.consultation.scheduledAt,
          petName: bookData.consultation.pet.name,
          vetName: bookData.consultation.vet?.name || null,
        });
        goToStep('confirmation');
      } else {
        // In production, redirect to payment gateway
        if (paymentData.redirectUrl) {
          window.location.href = paymentData.redirectUrl;
        } else {
          throw new Error('No payment redirect URL received');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Format selected time for display in review step
  const formatSelectedTime = () => {
    if (!selectedTimeSlot) return '';

    const date = new Date(selectedTimeSlot.datetime);
    const dateStr = date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return `${dateStr} at ${selectedTimeSlot.start}`;
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

      case 'select-time':
        return (
          <TimeSlotSelector
            onSelect={handleTimeSlotSelect}
            onBack={() => goToStep('describe-concern')}
            selectedSlot={selectedTimeSlot}
          />
        );

      case 'review':
        if (!selectedPet) return null;
        return (
          <div className={styles.stepContent}>
            {/* Show selected time before summary */}
            {selectedTimeSlot && (
              <div className={styles.selectedTimeBox}>
                <div className={styles.selectedTimeIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className={styles.selectedTimeText}>
                  <span className={styles.selectedTimeLabel}>Appointment time:</span>
                  <span className={styles.selectedTimeValue}>{formatSelectedTime()}</span>
                </div>
                <button
                  type="button"
                  className={styles.changeTimeButton}
                  onClick={() => goToStep('select-time')}
                >
                  Change
                </button>
              </div>
            )}

            <ConsultationSummary
              pet={selectedPet}
              concernText={concernText}
              symptoms={symptoms}
              isPlusUser={false} // TODO: Check subscription
              onSubmit={handleBookAndPay}
              onBack={() => goToStep('select-time')}
              loading={loading}
            />
            {error && <p className={styles.error}>{error}</p>}
          </div>
        );

      case 'confirmation':
        if (!bookedConsultation) return null;
        return (
          <BookingConfirmation
            consultationId={bookedConsultation.id}
            consultationNumber={bookedConsultation.consultationNumber}
            scheduledAt={bookedConsultation.scheduledAt}
            petName={bookedConsultation.petName}
            vetName={bookedConsultation.vetName}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {currentStep !== 'confirmation' && (
        <StepIndicator
          currentStep={stepNumber}
          totalSteps={5}
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
