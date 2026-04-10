/**
 * TreatmentPlanBuilder — vet-facing editor for building a structured
 * Treatment Plan with a live preview.
 *
 * Layout:
 *   - Top toolbar: plan number, status pill, save status, Preview PDF,
 *     Finalize & Send (or Regenerate if finalized).
 *   - Readiness panel when finalize is blocked, listing missing items.
 *   - Two-pane grid on desktop (editor | preview). On < 1024px viewports
 *     the preview collapses into an accordion below the editor.
 *
 * Persistence:
 *   - On mount: GET /api/treatment-plans?consultationId=
 *     If the server returned a `prefill` instead of an existing plan,
 *     POST /api/treatment-plans to create the row (prefilled from SOAP).
 *   - Autosave: debounced 1.5s after any field change, PATCH to
 *     /api/treatment-plans/[id]. Uses an in-flight promise ref to prevent
 *     concurrent writes (mirrors the SOAPForm pattern). Optimistic
 *     concurrency via updated_at.
 *   - Preview: POST /api/treatment-plans/[id]/preview-pdf with the
 *     current in-memory draft. Opens the returned PDF in a new tab.
 *   - Finalize: POST /api/treatment-plans/[id]/finalize with the current
 *     draft. On success, switches to finalized state and reloads the row.
 *
 * This is a client component. It does not touch Supabase directly — all
 * reads/writes go through the /api/treatment-plans/* endpoints so that
 * the server can enforce ownership and validation.
 */

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  emptyCustomSection,
  emptyLabTest,
  emptyMedication,
  emptyTreatmentPlanDraft,
  MEDICATION_ROUTES,
  LAB_TEST_URGENCIES,
  FOLLOW_UP_MODES,
  validateTreatmentPlanForFinalize,
  type TreatmentPlanDraft,
  type TreatmentPlanMedication,
  type TreatmentPlanLabTest,
  type TreatmentPlanCustomSection,
  type MedicationRoute,
  type LabTestUrgency,
  type FollowUpMode,
} from '@/lib/treatment-plans/schemas';
import type {
  AutosaveStatus,
  TreatmentPlanHeader,
  TreatmentPlanView,
} from '@/lib/treatment-plans/types';
import { TreatmentPlanPreview } from './TreatmentPlanPreview';
import styles from './TreatmentPlanBuilder.module.css';

interface Props {
  consultationId: string;
}

type SectionKey =
  | 'observations'
  | 'diagnosis'
  | 'lab_tests'
  | 'medications'
  | 'diet'
  | 'home_care'
  | 'warning_signs'
  | 'follow_up'
  | 'referral'
  | 'custom';

const DEFAULT_EXPANDED: Record<SectionKey, boolean> = {
  observations: true,
  diagnosis: true,
  lab_tests: true,
  medications: true,
  diet: false,
  home_care: false,
  warning_signs: true,
  follow_up: true,
  referral: false,
  custom: false,
};

const AUTOSAVE_DELAY_MS = 1500;

// ============================================================================
// Main component
// ============================================================================

export function TreatmentPlanBuilder({ consultationId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Server state
  const [planId, setPlanId] = useState<string | null>(null);
  const [planNumber, setPlanNumber] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'finalized'>('draft');
  const [version, setVersion] = useState<number>(1);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [header, setHeader] = useState<TreatmentPlanHeader | null>(null);
  const serverUpdatedAtRef = useRef<string>('');

  // Draft state
  const [draft, setDraft] = useState<TreatmentPlanDraft>(emptyTreatmentPlanDraft());
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>(DEFAULT_EXPANDED);

  // UI state
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle');
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Autosave refs
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);

  // --------------------------------------------------------------------------
  // Load (GET → optional POST to create)
  // --------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const getRes = await fetch(
          `/api/treatment-plans?consultationId=${encodeURIComponent(consultationId)}`,
          { cache: 'no-store' }
        );
        if (!getRes.ok) {
          const err = await getRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load treatment plan');
        }
        const getJson = await getRes.json();
        if (cancelled) return;

        if (getJson.treatmentPlan) {
          applyView(getJson.treatmentPlan as TreatmentPlanView);
          return;
        }

        // Need to POST to create the row. This populates it from SOAP.
        const postRes = await fetch('/api/treatment-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consultationId }),
        });
        if (!postRes.ok) {
          const err = await postRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create treatment plan');
        }
        const postJson = await postRes.json();
        if (cancelled) return;
        applyView(postJson.treatmentPlan as TreatmentPlanView);
      } catch (err) {
        console.error('TreatmentPlanBuilder load error:', err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId]);

  const applyView = useCallback((view: TreatmentPlanView) => {
    setPlanId(view.id);
    setPlanNumber(view.prescriptionNumber);
    setStatus(view.status);
    setVersion(view.version);
    setFinalizedAt(view.finalizedAt);
    setPdfUrl(view.pdfUrl);
    setHeader(view.header);
    setDraft(view.draft);
    serverUpdatedAtRef.current = view.updatedAt;
    setSaveStatus('saved');
    dirtyRef.current = false;
  }, []);

  // --------------------------------------------------------------------------
  // Autosave
  // --------------------------------------------------------------------------

  const performSave = useCallback(async () => {
    if (!planId || status === 'finalized') return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/treatment-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updated_at: serverUpdatedAtRef.current,
          draft,
        }),
      });

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'STALE_WRITE') {
          setSaveStatus('error');
          toast(
            'This plan was updated elsewhere. Reloading the latest version.',
            'error'
          );
          // Reload
          const getRes = await fetch(
            `/api/treatment-plans?consultationId=${encodeURIComponent(consultationId)}`,
            { cache: 'no-store' }
          );
          if (getRes.ok) {
            const j = await getRes.json();
            if (j.treatmentPlan) applyView(j.treatmentPlan);
          }
          return;
        }
        if (body.code === 'FINALIZED') {
          setStatus('finalized');
          setSaveStatus('error');
          toast('This plan is finalized — edits are locked.', 'error');
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Save failed');
      }

      const data = await res.json();
      serverUpdatedAtRef.current = data.updatedAt;
      setVersion(data.version);
      setSaveStatus('saved');
      dirtyRef.current = false;
    } catch (err) {
      console.error('Treatment plan autosave error:', err);
      setSaveStatus('error');
    }
  }, [planId, status, draft, consultationId, toast, applyView]);

  // Schedule debounced autosave whenever draft changes and we're dirty.
  useEffect(() => {
    if (!dirtyRef.current || status === 'finalized') return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      // Avoid overlapping saves.
      if (inFlightSaveRef.current) {
        // Re-schedule after current save completes.
        inFlightSaveRef.current.then(() => {
          if (dirtyRef.current) performSave();
        });
        return;
      }
      const p = performSave();
      inFlightSaveRef.current = p;
      p.finally(() => {
        inFlightSaveRef.current = null;
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, status]);

  // --------------------------------------------------------------------------
  // Draft mutations
  // --------------------------------------------------------------------------

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus('dirty');
  }, []);

  const updateDraft = useCallback(
    <K extends keyof TreatmentPlanDraft>(key: K, value: TreatmentPlanDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      markDirty();
    },
    [markDirty]
  );

  const toggleSection = (key: SectionKey) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // --------------------------------------------------------------------------
  // Preview + Finalize
  // --------------------------------------------------------------------------

  const handlePreview = useCallback(async () => {
    if (!planId) return;
    setIsPreviewing(true);
    try {
      // Flush pending saves first.
      if (dirtyRef.current) {
        await performSave();
      }
      const res = await fetch(`/api/treatment-plans/${planId}/preview-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Preview failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke after a delay so the new tab has time to load.
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('Preview error:', err);
      toast(err instanceof Error ? err.message : 'Preview failed', 'error');
    } finally {
      setIsPreviewing(false);
    }
  }, [planId, draft, performSave, toast]);

  const finalizeReadiness = useMemo(() => {
    const missing = validateTreatmentPlanForFinalize(draft);
    return { ready: missing.length === 0, missing };
  }, [draft]);

  const handleFinalize = useCallback(async () => {
    if (!planId) return;
    if (!finalizeReadiness.ready) {
      toast('Please complete the missing items before finalizing.', 'error');
      return;
    }
    const isRegen = status === 'finalized';
    const confirmMsg = isRegen
      ? 'This will replace the current finalized plan with a new version and send an updated email to the customer. Continue?'
      : 'This will send the treatment plan PDF to the customer by email and lock the plan for editing. Continue?';
    if (!window.confirm(confirmMsg)) return;

    setIsFinalizing(true);
    try {
      // Flush pending saves.
      if (dirtyRef.current) await performSave();

      const res = await fetch(`/api/treatment-plans/${planId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Finalize failed');
      }
      const data = await res.json();
      setStatus('finalized');
      setFinalizedAt(data.finalizedAt);
      setPdfUrl(data.pdfUrl);
      setVersion(data.version);
      setSaveStatus('saved');
      toast(
        isRegen
          ? 'Treatment plan regenerated and re-sent to the customer.'
          : 'Treatment plan finalized and sent to the customer.',
        'success'
      );
    } catch (err) {
      console.error('Finalize error:', err);
      toast(err instanceof Error ? err.message : 'Finalize failed', 'error');
    } finally {
      setIsFinalizing(false);
    }
  }, [planId, draft, status, finalizeReadiness, performSave, toast]);

  const handleUnlockForRegenerate = useCallback(() => {
    // Regenerate flow: switch back to editable mode locally so the vet
    // can tweak sections, then Finalize again (which archives the old
    // pdf_url and bumps version).
    if (
      !window.confirm(
        'Make edits and send an updated plan to the customer? The current finalized PDF will be archived.'
      )
    ) {
      return;
    }
    setStatus('draft');
    toast('You can now edit. Click Finalize & Send when ready.', 'success');
  }, [toast]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className={styles.emptyState}>
        Loading treatment plan…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.emptyState}>
        <p>Could not load treatment plan: {loadError}</p>
      </div>
    );
  }

  if (!planId || !header) {
    return (
      <div className={styles.emptyState}>
        Treatment plan not ready.
      </div>
    );
  }

  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'All changes saved'
        : saveStatus === 'dirty'
          ? 'Unsaved changes'
          : saveStatus === 'error'
            ? 'Save failed — will retry'
            : '';
  const saveStatusClass =
    saveStatus === 'saving'
      ? styles.saveStatusSaving
      : saveStatus === 'saved'
        ? styles.saveStatusSaved
        : saveStatus === 'error'
          ? styles.saveStatusError
          : '';

  const isFinalized = status === 'finalized';
  const finalizedDate = finalizedAt
    ? new Date(finalizedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.planNumber}>{planNumber}</span>
          <span
            className={`${styles.statusPill} ${
              isFinalized ? styles.statusFinalized : styles.statusDraft
            }`}
          >
            {isFinalized ? `Finalized v${version}` : 'Draft'}
          </span>
          {!isFinalized && (
            <span className={`${styles.saveStatus} ${saveStatusClass}`}>
              {saveStatusLabel}
            </span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreview}
            loading={isPreviewing}
            disabled={isFinalizing}
          >
            Preview PDF
          </Button>
          {isFinalized ? (
            <>
              {pdfUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                >
                  View Final PDF
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleUnlockForRegenerate}>
                Regenerate
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinalize}
              loading={isFinalizing}
              disabled={!finalizeReadiness.ready}
            >
              Finalize & Send
            </Button>
          )}
        </div>
      </div>

      {/* Readiness panel */}
      {!isFinalized && !finalizeReadiness.ready && (
        <div className={styles.readinessPanel}>
          <strong>Before finalizing:</strong>
          <ul>
            {finalizeReadiness.missing.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile preview toggle */}
      <button
        type="button"
        className={styles.previewToggle}
        onClick={() => setShowMobilePreview((p) => !p)}
      >
        <span>{showMobilePreview ? 'Hide Preview' : 'Show Preview'}</span>
        <span>{showMobilePreview ? '−' : '+'}</span>
      </button>

      {/* Two-pane grid */}
      <div className={styles.grid}>
        <div className={styles.editorCol}>
          <EditorPanel
            draft={draft}
            updateDraft={updateDraft}
            expanded={expanded}
            toggleSection={toggleSection}
            isLocked={isFinalized}
          />
        </div>
        <div
          className={
            showMobilePreview ? styles.previewCol : styles.previewColCollapsed
          }
        >
          <TreatmentPlanPreview
            draft={draft}
            header={header}
            planNumber={planNumber}
            finalizedDate={finalizedDate}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Editor panel — renders all the section editors
// ============================================================================

interface EditorPanelProps {
  draft: TreatmentPlanDraft;
  updateDraft: <K extends keyof TreatmentPlanDraft>(
    key: K,
    value: TreatmentPlanDraft[K]
  ) => void;
  expanded: Record<SectionKey, boolean>;
  toggleSection: (key: SectionKey) => void;
  isLocked: boolean;
}

function EditorPanel({
  draft,
  updateDraft,
  expanded,
  toggleSection,
  isLocked,
}: EditorPanelProps) {
  return (
    <div>
      <CollapsibleSection
        sectionKey="observations"
        title="Observations"
        hint="Clinical findings and narrative summary"
        expanded={expanded.observations}
        onToggle={() => toggleSection('observations')}
      >
        <TextareaField
          value={draft.observations}
          onChange={(v) => updateDraft('observations', v)}
          placeholder="General appearance, physical findings, behavioural observations…"
          disabled={isLocked}
          minHeight={100}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="diagnosis"
        title="Diagnosis"
        hint="Provisional or confirmed diagnosis"
        expanded={expanded.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
      >
        <TextareaField
          value={draft.diagnosis}
          onChange={(v) => updateDraft('diagnosis', v)}
          placeholder="Provisional diagnosis and any differentials the parent should be aware of"
          disabled={isLocked}
          minHeight={70}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="lab_tests"
        title="Recommended Lab Tests"
        hint={`${draft.lab_tests.length} test${draft.lab_tests.length === 1 ? '' : 's'}`}
        expanded={expanded.lab_tests}
        onToggle={() => toggleSection('lab_tests')}
      >
        <LabTestsEditor
          labTests={draft.lab_tests}
          onChange={(v) => updateDraft('lab_tests', v)}
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="medications"
        title="Medications"
        hint={`${draft.medications.length} item${draft.medications.length === 1 ? '' : 's'}`}
        expanded={expanded.medications}
        onToggle={() => toggleSection('medications')}
      >
        <MedicationsEditor
          medications={draft.medications}
          onChange={(v) => updateDraft('medications', v)}
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="diet"
        title="Diet & Nutrition"
        expanded={expanded.diet}
        onToggle={() => toggleSection('diet')}
      >
        <TextareaField
          value={draft.diet_nutrition}
          onChange={(v) => updateDraft('diet_nutrition', v)}
          placeholder="Recommended diet, foods to avoid, supplements, feeding schedule…"
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="home_care"
        title="Home Care & Lifestyle"
        expanded={expanded.home_care}
        onToggle={() => toggleSection('home_care')}
      >
        <TextareaField
          value={draft.home_care}
          onChange={(v) => updateDraft('home_care', v)}
          placeholder="At-home care routine, exercise, environmental changes…"
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="warning_signs"
        title="Warning Signs"
        hint="Required to finalize"
        expanded={expanded.warning_signs}
        onToggle={() => toggleSection('warning_signs')}
      >
        <TextareaField
          value={draft.warning_signs}
          onChange={(v) => updateDraft('warning_signs', v)}
          placeholder="Symptoms that warrant immediate veterinary attention — lethargy, repeated vomiting, collapse, breathing difficulty, etc."
          disabled={isLocked}
          minHeight={90}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="follow_up"
        title="Follow-up Plan"
        expanded={expanded.follow_up}
        onToggle={() => toggleSection('follow_up')}
      >
        <FollowUpEditor
          followUp={draft.follow_up}
          onChange={(v) => updateDraft('follow_up', v)}
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="referral"
        title="In-person Referral"
        expanded={expanded.referral}
        onToggle={() => toggleSection('referral')}
      >
        <TextareaField
          value={draft.in_person_advisory}
          onChange={(v) => updateDraft('in_person_advisory', v)}
          placeholder="If an in-person visit is recommended, add the reason, urgency and any specialist referral."
          disabled={isLocked}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey="custom"
        title="Additional Sections"
        hint={`${draft.custom_sections.length} section${draft.custom_sections.length === 1 ? '' : 's'}`}
        expanded={expanded.custom}
        onToggle={() => toggleSection('custom')}
      >
        <CustomSectionsEditor
          sections={draft.custom_sections}
          onChange={(v) => updateDraft('custom_sections', v)}
          disabled={isLocked}
        />
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Shared field primitives
// ============================================================================

function CollapsibleSection({
  title,
  hint,
  expanded,
  onToggle,
  children,
}: {
  sectionKey: SectionKey;
  title: string;
  hint?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={styles.sectionHeaderTitle}>
          {title}
          {hint && <span className={styles.sectionHeaderHint}>· {hint}</span>}
        </span>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>
          ▸
        </span>
      </button>
      {expanded && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function TextareaField({
  value,
  onChange,
  placeholder,
  disabled,
  minHeight,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}) {
  return (
    <div className={styles.field}>
      <textarea
        className={styles.textarea}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        style={minHeight ? { minHeight } : undefined}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

// ============================================================================
// Medications editor
// ============================================================================

function MedicationsEditor({
  medications,
  onChange,
  disabled,
}: {
  medications: TreatmentPlanMedication[];
  onChange: (v: TreatmentPlanMedication[]) => void;
  disabled?: boolean;
}) {
  const update = (idx: number, patch: Partial<TreatmentPlanMedication>) => {
    onChange(medications.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  const remove = (idx: number) => onChange(medications.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...medications];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className={styles.rowList}>
      {medications.length === 0 && (
        <div className={styles.emptyRow}>No medications yet.</div>
      )}
      {medications.map((m, idx) => (
        <div className={styles.rowCard} key={`med-${idx}`}>
          <div className={styles.rowHeader}>
            <span className={styles.rowHeaderTitle}>Medication #{idx + 1}</span>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, -1)}
                disabled={disabled || idx === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, 1)}
                disabled={disabled || idx === medications.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label="Remove medication"
              >
                ×
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              value={m.name}
              disabled={disabled}
              placeholder="e.g. Amoxicillin"
              onChange={(e) => update(idx, { name: e.target.value })}
            />
          </div>

          <div className={styles.rowFieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Dose</label>
              <input
                className={styles.input}
                value={m.dosage}
                disabled={disabled}
                placeholder="e.g. 250 mg"
                onChange={(e) => update(idx, { dosage: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Route</label>
              <select
                className={styles.select}
                value={m.route}
                disabled={disabled}
                onChange={(e) => update(idx, { route: e.target.value as MedicationRoute })}
              >
                {MEDICATION_ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Frequency</label>
              <input
                className={styles.input}
                value={m.frequency}
                disabled={disabled}
                placeholder="e.g. twice daily"
                onChange={(e) => update(idx, { frequency: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Duration</label>
              <input
                className={styles.input}
                value={m.duration}
                disabled={disabled}
                placeholder="e.g. 7 days"
                onChange={(e) => update(idx, { duration: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Instructions</label>
            <textarea
              className={styles.textarea}
              value={m.instructions}
              disabled={disabled}
              placeholder="With food, avoid dairy, complete the full course…"
              onChange={(e) => update(idx, { instructions: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className={styles.addRowBtn}
        onClick={() => onChange([...medications, emptyMedication()])}
        disabled={disabled}
      >
        + Add medication
      </button>
    </div>
  );
}

// ============================================================================
// Lab tests editor
// ============================================================================

function LabTestsEditor({
  labTests,
  onChange,
  disabled,
}: {
  labTests: TreatmentPlanLabTest[];
  onChange: (v: TreatmentPlanLabTest[]) => void;
  disabled?: boolean;
}) {
  const update = (idx: number, patch: Partial<TreatmentPlanLabTest>) => {
    onChange(labTests.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };
  const remove = (idx: number) => onChange(labTests.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...labTests];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className={styles.rowList}>
      {labTests.length === 0 && (
        <div className={styles.emptyRow}>No lab tests recommended yet.</div>
      )}
      {labTests.map((t, idx) => (
        <div className={styles.rowCard} key={`lab-${idx}`}>
          <div className={styles.rowHeader}>
            <span className={styles.rowHeaderTitle}>Lab test #{idx + 1}</span>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, -1)}
                disabled={disabled || idx === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, 1)}
                disabled={disabled || idx === labTests.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label="Remove lab test"
              >
                ×
              </button>
            </div>
          </div>

          <div className={styles.rowFieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Test name *</label>
              <input
                className={styles.input}
                value={t.name}
                disabled={disabled}
                placeholder="e.g. CBC, Liver panel, Urinalysis"
                onChange={(e) => update(idx, { name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Urgency</label>
              <select
                className={styles.select}
                value={t.urgency}
                disabled={disabled}
                onChange={(e) => update(idx, { urgency: e.target.value as LabTestUrgency })}
              >
                {LAB_TEST_URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Rationale</label>
            <input
              className={styles.input}
              value={t.rationale}
              disabled={disabled}
              placeholder="Why this test is recommended"
              onChange={(e) => update(idx, { rationale: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Instructions</label>
            <input
              className={styles.input}
              value={t.instructions}
              disabled={disabled}
              placeholder="Fasting required, sample handling, etc."
              onChange={(e) => update(idx, { instructions: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className={styles.addRowBtn}
        onClick={() => onChange([...labTests, emptyLabTest()])}
        disabled={disabled}
      >
        + Add lab test
      </button>
    </div>
  );
}

// ============================================================================
// Follow-up editor
// ============================================================================

function FollowUpEditor({
  followUp,
  onChange,
  disabled,
}: {
  followUp: TreatmentPlanDraft['follow_up'];
  onChange: (v: TreatmentPlanDraft['follow_up']) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof TreatmentPlanDraft['follow_up']>(
    key: K,
    value: TreatmentPlanDraft['follow_up'][K]
  ) => onChange({ ...followUp, [key]: value });

  return (
    <>
      <div className={styles.rowFieldGrid}>
        <div className={styles.field}>
          <label className={styles.label}>Mode</label>
          <select
            className={styles.select}
            value={followUp.mode}
            disabled={disabled}
            onChange={(e) => set('mode', e.target.value as FollowUpMode)}
          >
            {FOLLOW_UP_MODES.map((m) => (
              <option key={m} value={m}>
                {m === 'teleconsult'
                  ? 'Follow-up teleconsultation'
                  : m === 'in_person'
                    ? 'In-person visit'
                    : 'No scheduled follow-up'}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Timeframe</label>
          <input
            className={styles.input}
            value={followUp.timeframe}
            disabled={disabled}
            placeholder="e.g. 3–5 days"
            onChange={(e) => set('timeframe', e.target.value)}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Notes</label>
        <textarea
          className={styles.textarea}
          value={followUp.notes}
          disabled={disabled}
          placeholder="What to watch for, what to expect, when to book the follow-up"
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
    </>
  );
}

// ============================================================================
// Custom sections editor
// ============================================================================

function CustomSectionsEditor({
  sections,
  onChange,
  disabled,
}: {
  sections: TreatmentPlanCustomSection[];
  onChange: (v: TreatmentPlanCustomSection[]) => void;
  disabled?: boolean;
}) {
  const update = (idx: number, patch: Partial<TreatmentPlanCustomSection>) => {
    onChange(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const remove = (idx: number) => onChange(sections.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((s, i) => (s.order = i));
    onChange(next);
  };

  return (
    <div className={styles.rowList}>
      {sections.length === 0 && (
        <div className={styles.emptyRow}>
          Add any extra notes that don&apos;t fit in the standard sections.
        </div>
      )}
      {sections.map((s, idx) => (
        <div className={styles.rowCard} key={`cs-${idx}`}>
          <div className={styles.rowHeader}>
            <span className={styles.rowHeaderTitle}>Section #{idx + 1}</span>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, -1)}
                disabled={disabled || idx === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => move(idx, 1)}
                disabled={disabled || idx === sections.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label="Remove section"
              >
                ×
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              value={s.title}
              disabled={disabled}
              placeholder="e.g. Post-operative care"
              onChange={(e) => update(idx, { title: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Body</label>
            <textarea
              className={styles.textarea}
              value={s.body}
              disabled={disabled}
              placeholder="Section content"
              onChange={(e) => update(idx, { body: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className={styles.addRowBtn}
        onClick={() =>
          onChange([...sections, emptyCustomSection(sections.length)])
        }
        disabled={disabled}
      >
        + Add section
      </button>
    </div>
  );
}
