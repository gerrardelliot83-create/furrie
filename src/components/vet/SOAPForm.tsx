'use client';

import { useState, useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { revalidateConsultationPath } from '@/app/actions/revalidate';
import { formatIstTime } from '@/lib/time/ist';
import { buildSoapDelta, hasSoapChanges, type SoapValues } from './soapDelta';
import { SubjectiveSection } from './SubjectiveSection';
import { ObjectiveSection } from './ObjectiveSection';
import { AssessmentSection } from './AssessmentSection';
import { PlanSection } from './PlanSection';
import type { SoapNote, PrescribedMedication, VitalSigns } from '@/types';
import styles from './SOAPForm.module.css';

/** Lets the Treatment Plan tab save these notes before it finishes the consultation. */
export interface SOAPFormHandle {
  saveBeforeFinish: () => Promise<boolean>;
  isDiagnosisFromList: () => boolean;
}

interface SOAPFormProps {
  consultationId: string;
  petSpecies: 'dog' | 'cat';
  initialData?: Partial<SoapNote>;
  /** 'finish' the consultation, 'send_notes' after a cron close, or 'none'. */
  finishAction: 'finish' | 'send_notes' | 'none';
  /** Shown on the disabled button when finishAction is 'none'. */
  closedLabel: string;
  isFinishing: boolean;
  /** Called after the notes are saved; finishes the consultation (ConsultationDetailTabs). */
  onComplete: (options: { isDiagnosisFromList: boolean }) => Promise<void>;
  ref?: Ref<SOAPFormHandle>;
}

type SaveMode = 'auto' | 'manual' | 'before-finish';

interface FormData {
  // Subjective
  chiefComplaint: string;
  historyPresentIllness: string;
  behaviorChanges: string;
  appetiteChanges: string;
  activityLevelChanges: string;
  dietInfo: string;
  previousTreatments: string;
  environmentalFactors: string;
  otherPetsHousehold: string;
  // Objective
  generalAppearance: string;
  bodyConditionScore: string;
  visiblePhysicalFindings: string;
  respiratoryPattern: string;
  gaitMobility: string;
  vitalSigns: VitalSigns;
  referencedMediaUrls: string[];
  // Assessment
  provisionalDiagnosis: string;
  differentialDiagnoses: string[];
  confidenceLevel: 'low' | 'medium' | 'high' | null;
  teleconsultationLimitations: string;
  isDiagnosisFromList: boolean;
  // Plan
  medications: PrescribedMedication[];
  dietaryRecommendations: string;
  lifestyleModifications: string;
  homeCareInstructions: string;
  warningSigns: string;
  followUpTimeframe: string;
  inPersonVisitRecommended: boolean;
  inPersonUrgency: 'low' | 'medium' | 'high' | 'emergency' | null;
  referralSpecialist: string;
  additionalDiagnostics: string;
}

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export function SOAPForm({
  consultationId,
  petSpecies,
  initialData,
  finishAction,
  closedLabel,
  isFinishing,
  onComplete,
  ref,
}: SOAPFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    subjective: true,
    objective: true,
    assessment: true,
    plan: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogSections, setConfirmDialogSections] = useState('');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingManualSaveRef = useRef(false);

  const [formData, setFormData] = useState<FormData>({
    // Subjective
    chiefComplaint: initialData?.chiefComplaint || '',
    historyPresentIllness: initialData?.historyPresentIllness || '',
    behaviorChanges: initialData?.behaviorChanges || '',
    appetiteChanges: initialData?.appetiteChanges || '',
    activityLevelChanges: initialData?.activityLevelChanges || '',
    dietInfo: initialData?.dietInfo || '',
    previousTreatments: initialData?.previousTreatments || '',
    environmentalFactors: initialData?.environmentalFactors || '',
    otherPetsHousehold: initialData?.otherPetsHousehold || '',
    // Objective
    generalAppearance: initialData?.generalAppearance || '',
    bodyConditionScore: initialData?.bodyConditionScore || '',
    visiblePhysicalFindings: initialData?.visiblePhysicalFindings || '',
    respiratoryPattern: initialData?.respiratoryPattern || '',
    gaitMobility: initialData?.gaitMobility || '',
    vitalSigns: initialData?.vitalSigns || {},
    referencedMediaUrls: initialData?.referencedMediaUrls || [],
    // Assessment
    provisionalDiagnosis: initialData?.provisionalDiagnosis || '',
    differentialDiagnoses: initialData?.differentialDiagnoses || [],
    confidenceLevel: initialData?.confidenceLevel || null,
    teleconsultationLimitations: initialData?.teleconsultationLimitations || '',
    isDiagnosisFromList: false,
    // Plan
    medications: initialData?.medications || [],
    dietaryRecommendations: initialData?.dietaryRecommendations || '',
    lifestyleModifications: initialData?.lifestyleModifications || '',
    homeCareInstructions: initialData?.homeCareInstructions || '',
    warningSigns: initialData?.warningSigns || '',
    followUpTimeframe: initialData?.followUpTimeframe || '',
    inPersonVisitRecommended: initialData?.inPersonVisitRecommended || false,
    inPersonUrgency: initialData?.inPersonUrgency || null,
    referralSpecialist: initialData?.referralSpecialist || '',
    additionalDiagnostics: initialData?.additionalDiagnostics || '',
  });

  // What the server holds: set from the loaded note, then from each save. Only
  // fields that differ from it are sent (see soapDelta.ts, C-01).
  const baselineRef = useRef<SoapValues>(formData);
  const formDataRef = useRef<FormData>(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  const cancelAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async (mode: SaveMode): Promise<boolean> => {
    const isAutoSave = mode === 'auto';
    const { delta } = buildSoapDelta(formData, baselineRef.current, { autosave: isAutoSave });
    const hasDelta = Object.keys(delta).length > 0;

    if (hasDelta) {
      // Server route: assigned-vet check, vet_id/consultation_id set server-side,
      // and it writes only the keys it receives (partial upsert).
      let response: Response;
      try {
        response = await fetch(`/api/consultations/${consultationId}/soap-notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(delta),
        });
      } catch (networkError) {
        console.error('Error saving SOAP notes:', networkError);
        if (!isAutoSave) {
          toast('Failed to save notes. Check your connection and try again.', 'error');
        }
        return false;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Error saving SOAP notes:', response.status, errData);
        if (!isAutoSave) {
          toast(errData.error || 'Failed to save notes', 'error');
        }
        return false;
      }

      baselineRef.current = { ...baselineRef.current, ...delta };
      setLastSaved(new Date());
    }

    // Typing during the request, or a clear held back by autosave, stays unsaved.
    setHasUnsavedChanges(hasSoapChanges(formDataRef.current, baselineRef.current));

    if (!isAutoSave && hasDelta) {
      await revalidateConsultationPath(consultationId);
    }
    if (mode === 'manual') {
      toast('Notes saved successfully', 'success');
    }
    return true;
  }, [consultationId, formData, toast]);

  const saveNotes = useCallback(async (mode: SaveMode = 'manual'): Promise<boolean> => {
    // For manual saves: cancel any pending autosave and wait for in-flight save
    if (mode !== 'auto') {
      cancelAutosave();

      if (savePromiseRef.current) {
        // Wait for the in-flight save to finish, then save again with latest data
        pendingManualSaveRef.current = true;
        await savePromiseRef.current;
        pendingManualSaveRef.current = false;
      }
    } else {
      // For autosave: skip if a save is already in progress
      if (savePromiseRef.current) return true;
    }

    setIsSaving(true);
    const promise = performSave(mode);
    savePromiseRef.current = promise;

    try {
      const result = await promise;
      return result;
    } finally {
      savePromiseRef.current = null;
      setIsSaving(false);
    }
  }, [cancelAutosave, performSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (hasUnsavedChanges) {
      autosaveTimerRef.current = setTimeout(() => {
        saveNotes('auto');
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, saveNotes]);

  useImperativeHandle(
    ref,
    () => ({
      saveBeforeFinish: () => saveNotes('before-finish'),
      isDiagnosisFromList: () => formDataRef.current.isDiagnosisFromList,
    }),
    [saveNotes]
  );

  const handleGeneratePrescription = async () => {
    cancelAutosave();
    const saved = await saveNotes('manual');
    if (!saved) {
      toast('Please save your notes before generating a treatment plan', 'error');
      return;
    }
    router.push(`/consultations/${consultationId}/prescription`);
  };

  const handleComplete = async () => {
    // Validate required fields
    if (!formData.chiefComplaint) {
      toast('Please enter the chief complaint', 'error');
      return;
    }
    if (!formData.provisionalDiagnosis) {
      toast('Please enter a provisional diagnosis', 'error');
      return;
    }

    // Warn about empty optional sections (using in-page modal instead of window.confirm)
    const missingSections: string[] = [];
    if (!formData.vitalSigns.temperature && !formData.vitalSigns.heartRate && !formData.vitalSigns.respiratoryRate && !formData.vitalSigns.weight) {
      missingSections.push('Vital Signs');
    }
    if (!formData.generalAppearance && !formData.bodyConditionScore) {
      missingSections.push('Objective Findings');
    }
    if (!formData.dietaryRecommendations && !formData.homeCareInstructions && !formData.followUpTimeframe) {
      missingSections.push('Plan');
    }
    if (missingSections.length > 0) {
      setConfirmDialogSections(missingSections.join(', '));
      setShowConfirmDialog(true);
      return; // Wait for user to confirm via modal
    }

    // No missing sections — proceed directly
    await executeComplete();
  };

  const executeComplete = async () => {
    setShowConfirmDialog(false);

    // Notes first, then the server closes the consultation (one path, C-02).
    cancelAutosave();
    const saved = await saveNotes('before-finish');
    if (!saved) return; // performSave already told the vet why

    await onComplete({ isDiagnosisFromList: formData.isDiagnosisFromList });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>SOAP Notes</h1>
          {lastSaved && (
            <p className={styles.lastSaved}>
              Last saved: {formatIstTime(lastSaved)}
            </p>
          )}
          {hasUnsavedChanges && (
            <span className={styles.unsavedBadge}>Unsaved changes</span>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => saveNotes('manual')} loading={isSaving}>
            Save Draft
          </Button>
        </div>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('subjective')}
          >
            <span className={styles.sectionLetter}>S</span>
            <span className={styles.sectionTitle}>Subjective</span>
            <span className={`${styles.chevron} ${expandedSections.subjective ? styles.expanded : ''}`}>
              &#9660;
            </span>
          </button>
          {expandedSections.subjective && (
            <div className={styles.sectionContent}>
              <SubjectiveSection
                data={{
                  chiefComplaint: formData.chiefComplaint,
                  historyPresentIllness: formData.historyPresentIllness,
                  behaviorChanges: formData.behaviorChanges,
                  appetiteChanges: formData.appetiteChanges,
                  activityLevelChanges: formData.activityLevelChanges,
                  dietInfo: formData.dietInfo,
                  previousTreatments: formData.previousTreatments,
                  environmentalFactors: formData.environmentalFactors,
                  otherPetsHousehold: formData.otherPetsHousehold,
                }}
                onChange={updateFormData}
              />
            </div>
          )}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('objective')}
          >
            <span className={styles.sectionLetter}>O</span>
            <span className={styles.sectionTitle}>Objective</span>
            <span className={`${styles.chevron} ${expandedSections.objective ? styles.expanded : ''}`}>
              &#9660;
            </span>
          </button>
          {expandedSections.objective && (
            <div className={styles.sectionContent}>
              <ObjectiveSection
                data={{
                  generalAppearance: formData.generalAppearance,
                  bodyConditionScore: formData.bodyConditionScore,
                  visiblePhysicalFindings: formData.visiblePhysicalFindings,
                  respiratoryPattern: formData.respiratoryPattern,
                  gaitMobility: formData.gaitMobility,
                  vitalSigns: formData.vitalSigns,
                  referencedMediaUrls: formData.referencedMediaUrls,
                }}
                onChange={updateFormData}
                petSpecies={petSpecies}
              />
            </div>
          )}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('assessment')}
          >
            <span className={styles.sectionLetter}>A</span>
            <span className={styles.sectionTitle}>Assessment</span>
            <span className={`${styles.chevron} ${expandedSections.assessment ? styles.expanded : ''}`}>
              &#9660;
            </span>
          </button>
          {expandedSections.assessment && (
            <div className={styles.sectionContent}>
              <AssessmentSection
                data={{
                  provisionalDiagnosis: formData.provisionalDiagnosis,
                  differentialDiagnoses: formData.differentialDiagnoses,
                  confidenceLevel: formData.confidenceLevel,
                  teleconsultationLimitations: formData.teleconsultationLimitations,
                  isDiagnosisFromList: formData.isDiagnosisFromList,
                }}
                onChange={updateFormData}
                petSpecies={petSpecies}
              />
            </div>
          )}
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('plan')}
          >
            <span className={styles.sectionLetter}>P</span>
            <span className={styles.sectionTitle}>Plan</span>
            <span className={`${styles.chevron} ${expandedSections.plan ? styles.expanded : ''}`}>
              &#9660;
            </span>
          </button>
          {expandedSections.plan && (
            <div className={styles.sectionContent}>
              <PlanSection
                data={{
                  medications: formData.medications,
                  dietaryRecommendations: formData.dietaryRecommendations,
                  lifestyleModifications: formData.lifestyleModifications,
                  homeCareInstructions: formData.homeCareInstructions,
                  warningSigns: formData.warningSigns,
                  followUpTimeframe: formData.followUpTimeframe,
                  inPersonVisitRecommended: formData.inPersonVisitRecommended,
                  inPersonUrgency: formData.inPersonUrgency,
                  referralSpecialist: formData.referralSpecialist,
                  additionalDiagnostics: formData.additionalDiagnostics,
                }}
                onChange={updateFormData}
                petSpecies={petSpecies}
                diagnosis={formData.provisionalDiagnosis}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={handleGeneratePrescription}>
          Generate Treatment Plan
        </Button>
        {finishAction === 'none' ? (
          <Button variant="secondary" disabled>
            {closedLabel}
          </Button>
        ) : (
          <Button variant="primary" onClick={handleComplete} loading={isFinishing}>
            {finishAction === 'send_notes' ? 'Send notes to the pet parent' : 'Complete Consultation'}
          </Button>
        )}
      </div>

      {/* Confirmation modal for incomplete optional sections */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="Incomplete Sections"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            You haven&apos;t filled in: <strong>{confirmDialogSections}</strong>.
            Do you want to continue anyway?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>
              Go Back
            </Button>
            <Button variant="primary" onClick={executeComplete} loading={isFinishing}>
              Continue Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
