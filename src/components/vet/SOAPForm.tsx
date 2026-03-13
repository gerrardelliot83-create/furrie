'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { revalidateConsultationPath } from '@/app/actions/revalidate';
import { SubjectiveSection } from './SubjectiveSection';
import { ObjectiveSection } from './ObjectiveSection';
import { AssessmentSection } from './AssessmentSection';
import { PlanSection } from './PlanSection';
import type { SoapNote, PrescribedMedication, VitalSigns } from '@/types';
import styles from './SOAPForm.module.css';

interface SOAPFormProps {
  consultationId: string;
  vetId: string;
  petSpecies: 'dog' | 'cat';
  initialData?: Partial<SoapNote>;
}

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

export function SOAPForm({ consultationId, vetId, petSpecies, initialData }: SOAPFormProps) {
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

  const performSave = useCallback(async (isAutoSave: boolean): Promise<boolean> => {
    const supabase = createClient();

    const dbData = {
      consultation_id: consultationId,
      vet_id: vetId,
      chief_complaint: formData.chiefComplaint || null,
      history_present_illness: formData.historyPresentIllness || null,
      behavior_changes: formData.behaviorChanges || null,
      appetite_changes: formData.appetiteChanges || null,
      activity_level_changes: formData.activityLevelChanges || null,
      diet_info: formData.dietInfo || null,
      previous_treatments: formData.previousTreatments || null,
      environmental_factors: formData.environmentalFactors || null,
      other_pets_household: formData.otherPetsHousehold || null,
      general_appearance: formData.generalAppearance || null,
      body_condition_score: formData.bodyConditionScore || null,
      visible_physical_findings: formData.visiblePhysicalFindings || null,
      respiratory_pattern: formData.respiratoryPattern || null,
      gait_mobility: formData.gaitMobility || null,
      vital_signs: formData.vitalSigns,
      referenced_media_urls: formData.referencedMediaUrls,
      provisional_diagnosis: formData.provisionalDiagnosis || null,
      differential_diagnoses: formData.differentialDiagnoses,
      confidence_level: formData.confidenceLevel,
      teleconsultation_limitations: formData.teleconsultationLimitations || null,
      medications: formData.medications,
      dietary_recommendations: formData.dietaryRecommendations || null,
      lifestyle_modifications: formData.lifestyleModifications || null,
      home_care_instructions: formData.homeCareInstructions || null,
      warning_signs: formData.warningSigns || null,
      follow_up_timeframe: formData.followUpTimeframe || null,
      in_person_visit_recommended: formData.inPersonVisitRecommended,
      in_person_urgency: formData.inPersonUrgency,
      referral_specialist: formData.referralSpecialist || null,
      additional_diagnostics: formData.additionalDiagnostics || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('soap_notes')
      .select('id')
      .eq('consultation_id', consultationId)
      .single();

    let error;

    if (existing) {
      const result = await supabase
        .from('soap_notes')
        .update(dbData)
        .eq('consultation_id', consultationId);
      error = result.error;
    } else {
      const result = await supabase.from('soap_notes').insert(dbData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving SOAP notes:', error);
      if (!isAutoSave) {
        toast('Failed to save notes', 'error');
      }
      return false;
    }

    setLastSaved(new Date());
    setHasUnsavedChanges(false);

    if (!isAutoSave) {
      await revalidateConsultationPath(consultationId);
      toast('Notes saved successfully', 'success');
    }
    return true;
  }, [consultationId, vetId, formData, toast]);

  const saveNotes = useCallback(async (isAutoSave = false): Promise<boolean> => {
    // For manual saves: cancel any pending autosave and wait for in-flight save
    if (!isAutoSave) {
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
    const promise = performSave(isAutoSave);
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
        saveNotes(true);
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, saveNotes]);

  const handleGeneratePrescription = async () => {
    cancelAutosave();
    const saved = await saveNotes(false);
    if (!saved) {
      toast('Please save your notes before generating a treatment plan', 'error');
      return;
    }
    router.push(`/consultations/${consultationId}/prescription`);
  };

  // Maximum consultation duration cap (in minutes)
  // Consultations are 15-30 min slots; 60 min is a generous safety margin
  const MAX_DURATION_MINUTES = 60;

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

    // Cancel autosave and save notes first
    cancelAutosave();
    const saved = await saveNotes(false);
    if (!saved) {
      toast('Failed to save notes. Please try again.', 'error');
      return;
    }

    // Calculate duration with a safety cap to prevent absurd values
    // (e.g., 13935 min when a stale 'active' consultation is completed days later)
    const now = new Date();
    const endedAt = now.toISOString();

    // Update consultation status to closed with success outcome
    const supabase = createClient();

    // First, fetch the consultation to get started_at for duration calculation
    const { data: consultation } = await supabase
      .from('consultations')
      .select('started_at, duration_minutes')
      .eq('id', consultationId)
      .single();

    let durationMinutes: number | null = null;
    if (consultation?.started_at) {
      const rawDuration = Math.ceil(
        (now.getTime() - new Date(consultation.started_at).getTime()) / 60000
      );
      // Cap duration — if it exceeds MAX_DURATION_MINUTES, something went wrong
      // (webhook failure, browser crash, etc.)
      durationMinutes = Math.min(rawDuration, MAX_DURATION_MINUTES);
    }

    // Only set duration if not already set by Daily.co webhook
    const updateData: Record<string, unknown> = {
      status: 'closed',
      outcome: 'success',
      ended_at: endedAt,
      updated_at: endedAt,
    };

    // Only override duration if it wasn't set by the webhook or if it's clearly wrong
    if (!consultation?.duration_minutes || consultation.duration_minutes > MAX_DURATION_MINUTES) {
      updateData.duration_minutes = durationMinutes;
    }

    const { error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', consultationId);

    if (error) {
      console.error('Error completing consultation:', error);
      toast('Failed to complete consultation', 'error');
      return;
    }

    // Revalidate the consultation detail page cache
    await revalidateConsultationPath(consultationId);

    // Create follow-up thread (non-blocking, don't fail if this fails)
    try {
      const threadRes = await fetch('/api/follow-up/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      });
      if (!threadRes.ok) {
        const errData = await threadRes.json().catch(() => ({}));
        console.error('Follow-up thread creation failed:', threadRes.status, errData);
      }
    } catch (threadError) {
      // Log but don't block consultation completion
      console.error('Failed to create follow-up thread:', threadError);
    }

    // Capture treatment analytics for intelligent autocomplete + AI/ML training
    try {
      const analyticsRes = await fetch('/api/analytics/capture-treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          isDiagnosisFromList: formData.isDiagnosisFromList,
        }),
      });
      if (!analyticsRes.ok) {
        const errData = await analyticsRes.json().catch(() => ({}));
        console.error('Treatment analytics capture failed:', analyticsRes.status, errData);
      }
    } catch (analyticsError) {
      console.error('Failed to capture treatment analytics:', analyticsError);
    }

    // Send consultation completed email (non-blocking)
    try {
      const emailRes = await fetch('/api/email/consultation-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      });
      if (!emailRes.ok) {
        const errData = await emailRes.json().catch(() => ({}));
        console.error('Consultation completed email failed:', emailRes.status, errData);
      }
    } catch (emailError) {
      console.error('Failed to send completed email:', emailError);
    }

    toast('Consultation completed', 'success');
    router.push('/consultations');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>SOAP Notes</h1>
          {lastSaved && (
            <p className={styles.lastSaved}>
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
          {hasUnsavedChanges && (
            <span className={styles.unsavedBadge}>Unsaved changes</span>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => saveNotes(false)} loading={isSaving}>
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
        <Button variant="primary" onClick={handleComplete}>
          Complete Consultation
        </Button>
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
            <Button variant="primary" onClick={executeComplete}>
              Continue Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
