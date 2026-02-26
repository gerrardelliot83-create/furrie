'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { CarePlanCategory, CarePlanStepType } from '@/types';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface StepForm {
  tempId: string;
  title: string;
  instructions: string;
  stepType: CarePlanStepType;
  dueDate: string;
  requiresResponse: boolean;
}

const CATEGORIES: { value: CarePlanCategory; label: string }[] = [
  { value: 'preventive', label: 'Preventive Care' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'medication', label: 'Medication' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'custom', label: 'Custom' },
];

const STEP_TYPES: { value: CarePlanStepType; label: string }[] = [
  { value: 'medication', label: 'Medication' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'test', label: 'Test/Lab' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'video_check_in', label: 'Video Check-in' },
  { value: 'custom', label: 'Custom' },
];

function createEmptyStep(): StepForm {
  return {
    tempId: crypto.randomUUID(),
    title: '',
    instructions: '',
    stepType: 'custom',
    dueDate: '',
    requiresResponse: false,
  };
}

export default function CreateCarePlanPage({ params }: PageProps) {
  const { id: petId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CarePlanCategory>('treatment');
  const [steps, setSteps] = useState<StepForm[]>([createEmptyStep()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStep = () => {
    setSteps((prev) => [...prev, createEmptyStep()]);
  };

  const removeStep = (tempId: string) => {
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const updateStep = (tempId: string, updates: Partial<StepForm>) => {
    setSteps((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
    );
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast('Please enter a plan title', 'error');
      return;
    }

    const validSteps = steps.filter((s) => s.title.trim());
    if (validSteps.length === 0) {
      toast('Please add at least one step with a title', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/care-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          status: 'active',
          steps: validSteps.map((s) => ({
            title: s.title.trim(),
            instructions: s.instructions.trim() || null,
            stepType: s.stepType,
            dueDate: s.dueDate || null,
            requiresResponse: s.requiresResponse,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create care plan');
      }

      toast('Care plan published successfully', 'success');
      router.push(`/patients/${petId}`);
    } catch (error) {
      console.error('Error creating care plan:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to create care plan',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link href={`/patients/${petId}`} className={styles.backLink}>
        Back to Patient
      </Link>

      <h1 className={styles.pageTitle}>Create Care Plan</h1>

      {/* Plan Details */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="planTitle">
              Plan Title *
            </label>
            <input
              id="planTitle"
              type="text"
              className={styles.input}
              placeholder="e.g., Post-Surgery Recovery Plan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="planDescription">
              Description
            </label>
            <textarea
              id="planDescription"
              className={styles.textarea}
              placeholder="Optional description or notes for the pet parent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="planCategory">
              Category *
            </label>
            <select
              id="planCategory"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as CarePlanCategory)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Steps ({steps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.stepsList}>
            {steps.map((step, index) => (
              <div key={step.tempId} className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>Step {index + 1}</span>
                  <div className={styles.stepActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      title="Move down"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        className={styles.iconButtonDanger}
                        onClick={() => removeStep(step.tempId)}
                        title="Remove step"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.stepBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., Give Cephalexin 250mg twice daily"
                      value={step.title}
                      onChange={(e) => updateStep(step.tempId, { title: e.target.value })}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Step Type</label>
                      <select
                        className={styles.select}
                        value={step.stepType}
                        onChange={(e) =>
                          updateStep(step.tempId, { stepType: e.target.value as CarePlanStepType })
                        }
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Due Date</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={step.dueDate}
                        onChange={(e) => updateStep(step.tempId, { dueDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Instructions</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Detailed guidance for the pet parent"
                      value={step.instructions}
                      onChange={(e) => updateStep(step.tempId, { instructions: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={step.requiresResponse}
                      onChange={(e) =>
                        updateStep(step.tempId, { requiresResponse: e.target.checked })
                      }
                    />
                    <span>Requires response (pet parent must provide text, photo, or video before marking complete)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" onClick={addStep} className={styles.addStepButton}>
            Add Step
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className={styles.footer}>
        <Button
          variant="secondary"
          onClick={() => router.push(`/patients/${petId}`)}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
        >
          Publish Plan
        </Button>
      </div>
    </div>
  );
}
