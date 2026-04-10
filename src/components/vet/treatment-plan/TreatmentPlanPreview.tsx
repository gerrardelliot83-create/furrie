/**
 * TreatmentPlanPreview — HTML preview that visually mirrors the PDF.
 *
 * Consumes the same TreatmentPlanDraft + TreatmentPlanHeader shapes as
 * TreatmentPlanPDF. Not identical layout (HTML vs. @react-pdf/renderer
 * have different constraints), but uses the same sections, order, and
 * brand tokens so vets see a high-fidelity preview while editing.
 */

'use client';

import styles from './TreatmentPlanPreview.module.css';
import type { TreatmentPlanDraft, LabTestUrgency } from '@/lib/treatment-plans/schemas';
import type { TreatmentPlanHeader } from '@/lib/treatment-plans/types';

interface Props {
  draft: TreatmentPlanDraft;
  header: TreatmentPlanHeader;
  planNumber: string;
  finalizedDate: string;
}

const ROUTE_LABELS: Record<string, string> = {
  oral: 'Oral',
  topical: 'Topical',
  injection: 'Injection',
  eye_drops: 'Eye drops',
  ear_drops: 'Ear drops',
  rectal: 'Rectal',
  inhalation: 'Inhalation',
  other: 'Other',
};

const MODE_LABELS: Record<string, string> = {
  teleconsult: 'Follow-up teleconsultation',
  in_person: 'In-person visit',
  none: 'No scheduled follow-up',
};

function urgencyClass(u: LabTestUrgency) {
  if (u === 'urgent') return styles.badgeUrgent;
  if (u === 'stat') return styles.badgeStat;
  return styles.badgeRoutine;
}

function prefixDr(name: string): string {
  if (!name) return 'Veterinarian';
  return name.trim().toLowerCase().startsWith('dr') ? name : `Dr. ${name}`;
}

function speciesLabel(s: string): string {
  if (!s) return 'Pet';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TreatmentPlanPreview({ draft, header, planNumber, finalizedDate }: Props) {
  const hasMeds = draft.medications.some((m) => m.name.trim().length > 0);
  const hasLabs = draft.lab_tests.some((t) => t.name.trim().length > 0);
  const hasFollowUp = draft.follow_up.mode !== 'none';

  return (
    <div className={styles.doc}>
      <div className={styles.headerBand}>
        <div className={styles.headerLeft}>
          <div>
            <div className={styles.headerLabel}>Veterinary Document</div>
            <div className={styles.headerTitle}>Treatment Plan</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerMetaStrong}>{planNumber}</div>
          <div className={styles.headerMeta}>{finalizedDate}</div>
        </div>
      </div>
      <div className={styles.accentStripe} />

      <div className={styles.metaGrid}>
        <div className={styles.metaCard}>
          <div className={styles.metaCardTitle}>Veterinarian</div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Name</span>
            <span className={styles.metaValue}>{prefixDr(header.vet.name)}</span>
          </div>
          {header.vet.vciNumber && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>VCI Reg.</span>
              <span className={styles.metaValue}>{header.vet.vciNumber}</span>
            </div>
          )}
          {header.vet.qualifications && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Qualifications</span>
              <span className={styles.metaValue}>{header.vet.qualifications}</span>
            </div>
          )}
          {header.vet.specializations && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Specialization</span>
              <span className={styles.metaValue}>{header.vet.specializations}</span>
            </div>
          )}
        </div>

        <div className={styles.metaCard}>
          <div className={styles.metaCardTitle}>Patient</div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Name</span>
            <span className={styles.metaValue}>{header.pet.name}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Species</span>
            <span className={styles.metaValue}>
              {speciesLabel(header.pet.species)}
              {header.pet.breed ? ` · ${header.pet.breed}` : ''}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Age</span>
            <span className={styles.metaValue}>
              {header.pet.ageDisplay}
              {header.pet.weight ? ` · ${header.pet.weight}` : ''}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Parent</span>
            <span className={styles.metaValue}>
              {header.owner.name}
              {header.owner.phone ? ` · ${header.owner.phone}` : ''}
            </span>
          </div>
        </div>
      </div>

      {draft.observations?.trim() && (
        <Section title="Observations">
          <p className={styles.body}>{draft.observations}</p>
        </Section>
      )}

      {draft.diagnosis?.trim() && (
        <div className={styles.diagnosisBox}>
          <div className={styles.diagnosisLabel}>Diagnosis</div>
          <div className={styles.diagnosisText}>{draft.diagnosis}</div>
        </div>
      )}

      {hasLabs && (
        <Section title="Recommended Lab Tests">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Urgency</th>
                <th>Rationale / Instructions</th>
              </tr>
            </thead>
            <tbody>
              {draft.lab_tests
                .filter((t) => t.name.trim().length > 0)
                .map((t, idx) => (
                  <tr key={`lab-${idx}`}>
                    <td className={styles.cellStrong}>{t.name}</td>
                    <td>
                      <span className={`${styles.badge} ${urgencyClass(t.urgency)}`}>
                        {t.urgency.toUpperCase()}
                      </span>
                    </td>
                    <td>{[t.rationale, t.instructions].filter(Boolean).join(' — ') || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Section>
      )}

      {hasMeds && (
        <Section title="Medications">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dose</th>
                <th>Route</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {draft.medications
                .filter((m) => m.name.trim().length > 0)
                .map((m, idx) => (
                  <tr key={`med-${idx}`}>
                    <td className={styles.cellStrong}>{m.name}</td>
                    <td>{m.dosage || '—'}</td>
                    <td>{ROUTE_LABELS[m.route] ?? m.route}</td>
                    <td>{m.frequency || '—'}</td>
                    <td>{m.duration || '—'}</td>
                    <td>{m.instructions || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Section>
      )}

      {draft.diet_nutrition?.trim() && (
        <Section title="Diet & Nutrition">
          <p className={styles.body}>{draft.diet_nutrition}</p>
        </Section>
      )}

      {draft.home_care?.trim() && (
        <Section title="Home Care & Lifestyle">
          <p className={styles.body}>{draft.home_care}</p>
        </Section>
      )}

      {draft.warning_signs?.trim() && (
        <div className={styles.warningBox}>
          <div className={styles.warningTitle}>Warning Signs to Watch</div>
          <div className={styles.warningText}>{draft.warning_signs}</div>
        </div>
      )}

      {hasFollowUp && (
        <Section title="Follow-up Plan">
          <div className={styles.pillRow}>
            <span className={styles.pill}>{MODE_LABELS[draft.follow_up.mode]}</span>
            {draft.follow_up.timeframe && (
              <span className={styles.pill}>{draft.follow_up.timeframe}</span>
            )}
          </div>
          {draft.follow_up.notes && <p className={styles.body}>{draft.follow_up.notes}</p>}
        </Section>
      )}

      {draft.in_person_advisory?.trim() && (
        <Section title="In-person Referral">
          <p className={styles.body}>{draft.in_person_advisory}</p>
        </Section>
      )}

      {draft.custom_sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .filter((s) => s.title.trim() && s.body.trim())
        .map((s, idx) => (
          <Section key={`cs-${idx}`} title={s.title}>
            <p className={styles.body}>{s.body}</p>
          </Section>
        ))}

      <div className={styles.disclaimer}>
        <div className={styles.disclaimerTitle}>Disclaimer</div>
        <p className={styles.disclaimerText}>
          This treatment plan has been prepared based on a teleconsultation and the
          information shared by the pet parent. It remains valid for 30 days. Teleconsultation
          has inherent limitations — if the pet&apos;s condition changes, worsens, or does not
          improve as expected, please seek in-person veterinary care immediately.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionTick} />
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}
