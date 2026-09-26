'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { hasSevereSymptoms } from '@/lib/data/symptoms';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { PetImage } from '@/components/ui/PetImage';
import { FileUpload } from '@/components/customer/FileUpload';
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
  plusPetIds?: string[];
  hasPackCredit?: boolean;
  /** Total usable credits across all packs. */
  packCreditsRemaining?: number;
  preselectedPetId?: string | null;
}

export function ConnectFlow({ initialPets, plusPetIds = [], hasPackCredit = false, packCreditsRemaining = 0, preselectedPetId }: ConnectFlowProps) {
  const tCommon = useTranslations('common');
  const router = useRouter();

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('select-pet');
  const [pets] = useState<Pet[]>(initialPets);

  // Form data — preselect pet from prop or if only one pet
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    preselectedPetId && initialPets.some((p) => p.id === preselectedPetId)
      ? preselectedPetId
      : initialPets.length === 1 ? initialPets[0].id : null
  );
  const [concernText, setConcernText] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; mediaType: 'photo' | 'video' | 'document' }[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [bookedConsultation, setBookedConsultation] = useState<BookedConsultation | null>(null);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const isPlusUser = selectedPetId ? plusPetIds.includes(selectedPetId) : false;
  const showEmergencyWarning = hasSevereSymptoms(symptoms);

  // Step number for indicator (5 steps now)
  const stepNumber = {
    'select-pet': 1,
    'describe-concern': 2,
    'select-time': 3,
    'review': 4,
    'confirmation': 5,
  }[currentStep];

  const stepLabels = ['Pet', 'Concern', 'Time', 'Review', 'Done'];

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

  const handleBook = async () => {
    if (!selectedPetId || !selectedTimeSlot) return;

    setLoading(true);
    setError(null);
    setOutOfCredits(false);

    try {
      // Booking takes one credit and confirms the slot in one step (L1).
      const bookResponse = await fetch('/api/consultations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: selectedPetId,
          scheduledAt: selectedTimeSlot.datetime,
          concernText: concernText.trim() || null,
          symptomCategories: symptoms,
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        }),
      });

      const bookData = await bookResponse.json();

      if (!bookResponse.ok) {
        if (bookData.code === 'NO_CREDITS') {
          setOutOfCredits(true);
        }
        throw new Error(bookData.error || 'Failed to book consultation');
      }

      setBookedConsultation({
        id: bookData.consultation.id,
        consultationNumber: bookData.consultation.consultationNumber,
        scheduledAt: bookData.consultation.scheduledAt,
        petName: bookData.consultation.pet.name,
        vetName: bookData.consultation.vet?.name || null,
      });
      goToStep('confirmation');
      router.refresh();
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
      timeZone: 'Asia/Kolkata',
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

            {/* Photo/Video uploads */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Add photos, video, or documents (optional)</label>
              {uploadedMedia.length > 0 && (
                <div className={styles.mediaPreview}>
                  {uploadedMedia.map((m, i) => (
                    <div key={`${m.url}-${i}`} className={styles.mediaPreviewItem}>
                      {m.mediaType === 'photo' ? (
                        <PetImage src={m.url} alt={`Upload ${i + 1}`} width={120} height={120} className={styles.mediaThumb} />
                      ) : m.mediaType === 'document' ? (
                        <div className={styles.mediaDocTag}>PDF</div>
                      ) : (
                        <div className={styles.mediaVideoTag}>Video</div>
                      )}
                      <button
                        type="button"
                        className={styles.mediaRemove}
                        onClick={() => setUploadedMedia((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="Remove"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {uploadedMedia.filter((m) => m.mediaType === 'photo').length < 5 && (
                <FileUpload
                  endpoint="consultationImage"
                  onUploadComplete={(urls) => {
                    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'photo' as const }))]);
                  }}
                  maxFiles={5 - uploadedMedia.filter((m) => m.mediaType === 'photo').length}
                />
              )}
              {uploadedMedia.filter((m) => m.mediaType === 'video').length < 1 && (
                <FileUpload
                  endpoint="consultationVideo"
                  onUploadComplete={(urls) => {
                    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'video' as const }))]);
                  }}
                  maxFiles={1}
                />
              )}
              {uploadedMedia.filter((m) => m.mediaType === 'document').length < 3 && (
                <FileUpload
                  endpoint="consultationDocument"
                  onUploadComplete={(urls) => {
                    setUploadedMedia((prev) => [...prev, ...urls.map((url) => ({ url, mediaType: 'document' as const }))]);
                  }}
                  maxFiles={3 - uploadedMedia.filter((m) => m.mediaType === 'document').length}
                />
              )}
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
                  <span className={styles.selectedTimeLabel}>Appointment time: </span>
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
              isPlusUser={isPlusUser}
              hasPackCredit={hasPackCredit}
              packCreditsRemaining={packCreditsRemaining}
              onSubmit={handleBook}
              onBack={() => goToStep('select-time')}
              loading={loading}
            />
            {error && <p className={styles.error}>{error}</p>}
            {outOfCredits && (
              <Link href="/buy" className={styles.error}>
                Buy consultations →
              </Link>
            )}
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
        {loading && currentStep === 'review' ? (
          <div className={styles.loadingOverlay}>
            <Spinner size="lg" />
            <p className={styles.loadingText}>Processing your booking...</p>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
}
