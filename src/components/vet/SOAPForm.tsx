'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
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
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const saveNotes = useCallback(async (isAutoSave = false) => {
    if (isSaving) return;

    setIsSaving(true);

    const supabase = createClient();

    // Map to database column names
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

    // Check if SOAP note exists
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

    setIsSaving(false);

    if (error) {
      console.error('Error saving SOAP notes:', error);
      if (!isAutoSave) {
        toast('Failed to save notes', 'error');
      }
      return;
    }

    setLastSaved(new Date());
    setHasUnsavedChanges(false);

    // Revalidate the consultation detail page cache (only for manual saves)
    if (!isAutoSave) {
      await revalidateConsultationPath(consultationId);
      toast('Notes saved successfully', 'success');
    }
  }, [consultationId, vetId, formData, isSaving, toast]);

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
    // First save the notes
    await saveNotes(false);

    // Navigate to prescription generation
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

    // Save notes first
    await saveNotes(false);

    // Update consultation status to closed with success outcome
    const supabase = createClient();
    const { error } = await supabase
      .from('consultations')
      .update({
        status: 'closed',
        outcome: 'success',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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
      await fetch('/api/follow-up/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      });
    } catch (threadError) {
      // Log but don't block consultation completion
      console.error('Failed to create follow-up thread:', threadError);
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
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={handleGeneratePrescription}>
          Generate Prescription
        </Button>
        <Button variant="primary" onClick={handleComplete}>
          Complete Consultation
        </Button>
      </div>
    </div>
  );
}
