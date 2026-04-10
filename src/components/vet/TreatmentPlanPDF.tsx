/**
 * TreatmentPlanPDF — redesigned, section-wise PDF for the Treatment Plan.
 *
 * Replaces the older flat `PrescriptionPDF`. This component consumes the
 * same TreatmentPlanDraft + TreatmentPlanHeader shapes used by the
 * builder and the HTML preview, so all three renderings stay in sync.
 *
 * Visual hierarchy:
 *   1. Header band with brand, document type, number, date
 *   2. Two-column meta (Vet | Pet + Owner)
 *   3. Observations (optional narrative)
 *   4. Diagnosis (prominent callout)
 *   5. Recommended Lab Tests (table, optional)
 *   6. Medications (table, optional)
 *   7. Diet & Nutrition
 *   8. Home Care & Lifestyle
 *   9. Warning Signs (yellow-bordered callout)
 *   10. Follow-up plan
 *   11. In-person Referral (optional)
 *   12. Custom sections
 *   13. Disclaimer
 *   14. Footer
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type {
  TreatmentPlanDraft,
  LabTestUrgency,
} from '@/lib/treatment-plans/schemas';
import type { TreatmentPlanHeader } from '@/lib/treatment-plans/types';

// ----------------------------------------------------------------------------
// Data contract
// ----------------------------------------------------------------------------

export interface TreatmentPlanPdfData {
  planNumber: string;
  finalizedDate: string; // e.g. "09 April 2026"
  consultationId: string;
  draft: TreatmentPlanDraft;
  header: TreatmentPlanHeader;
}

// ----------------------------------------------------------------------------
// Brand tokens (kept in a single place for easy tuning)
// ----------------------------------------------------------------------------

const BRAND = {
  primary: '#1E5081', // Dusk Blue
  primaryDark: '#153c60',
  accent: '#3971B8', // Furrie Blue
  accentSoft: '#E8EFF7',
  green: '#c8d69b',
  yellow: '#f6e6a5',
  warningFill: '#FFF8E1',
  warningBorder: '#F2B400',
  warningText: '#6B4B00',
  surface: '#FAFBFD',
  border: '#E2E6EE',
  textPrimary: '#0E1A2B',
  textSecondary: '#55637A',
  textMuted: '#8892A5',
} as const;

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: BRAND.textPrimary,
  },

  // Header band ------------------------------------------------------------
  headerBand: {
    backgroundColor: BRAND.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 88, height: 42 },
  headerLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    opacity: 0.85,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  headerRight: { alignItems: 'flex-end' },
  headerMeta: { color: '#FFFFFF', fontSize: 9, marginTop: 1, opacity: 0.9 },
  headerMetaStrong: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  accentStripe: {
    height: 4,
    backgroundColor: BRAND.green,
    marginBottom: 14,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  // Meta grid --------------------------------------------------------------
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metaCard: {
    flex: 1,
    backgroundColor: BRAND.surface,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 5,
    padding: 10,
  },
  metaCardTitle: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.primary,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: {
    width: 72,
    fontSize: 9,
    color: BRAND.textSecondary,
  },
  metaValue: {
    flex: 1,
    fontSize: 9,
    color: BRAND.textPrimary,
  },

  // Section ----------------------------------------------------------------
  section: { marginBottom: 12 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTick: {
    width: 4,
    height: 13,
    backgroundColor: BRAND.primary,
    borderRadius: 2,
    marginRight: 7,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: BRAND.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBody: { fontSize: 10, lineHeight: 1.55, color: BRAND.textPrimary },

  // Diagnosis callout ------------------------------------------------------
  diagnosisBox: {
    backgroundColor: BRAND.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.accent,
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  diagnosisText: { fontSize: 11, color: BRAND.textPrimary, lineHeight: 1.5 },

  // Tables -----------------------------------------------------------------
  table: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: BRAND.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  tableRowZebra: { backgroundColor: BRAND.surface },
  tableCell: { fontSize: 9, color: BRAND.textPrimary },
  tableCellStrong: { fontSize: 9, color: BRAND.textPrimary, fontWeight: 'bold' },

  // Medication columns
  medCol1: { width: '22%', paddingRight: 4 },
  medCol2: { width: '13%', paddingRight: 4 },
  medCol3: { width: '12%', paddingRight: 4 },
  medCol4: { width: '16%', paddingRight: 4 },
  medCol5: { width: '13%', paddingRight: 4 },
  medCol6: { width: '24%' },

  // Lab test columns
  labCol1: { width: '30%', paddingRight: 4 },
  labCol2: { width: '14%', paddingRight: 4 },
  labCol3: { width: '56%' },

  // Urgency badge
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: 'bold',
  },
  badgeRoutine: { backgroundColor: '#E8F3E9', color: '#2D6A31' },
  badgeUrgent: { backgroundColor: '#FFF3E0', color: '#A45A00' },
  badgeStat: { backgroundColor: '#FDE7E7', color: '#A7261D' },

  // Warning callout --------------------------------------------------------
  warningBox: {
    backgroundColor: BRAND.warningFill,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.warningBorder,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND.warningText,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningText: { fontSize: 9.5, color: BRAND.warningText, lineHeight: 1.55 },

  // Follow-up pill row
  followUpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  followUpPill: {
    backgroundColor: BRAND.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 9,
    color: BRAND.primary,
    fontWeight: 'bold',
  },

  // Disclaimer & footer ----------------------------------------------------
  disclaimer: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#F1F3F8',
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: BRAND.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  disclaimerText: { fontSize: 8, color: BRAND.textSecondary, lineHeight: 1.5 },

  footer: {
    position: 'absolute',
    bottom: 22,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 8, color: BRAND.textMuted },
});

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const DISCLAIMER_TEXT =
  'This treatment plan has been prepared based on a teleconsultation and the information shared by the pet parent. It remains valid for 30 days. Teleconsultation has inherent limitations — if the pet\u2019s condition changes, worsens, or does not improve as expected, please seek in-person veterinary care immediately.';

const FOOTER_TEXT =
  'Generated via Furrie Teleconsultation Platform  •  www.furrie.in';

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

function urgencyStyle(u: LabTestUrgency) {
  switch (u) {
    case 'urgent':
      return styles.badgeUrgent;
    case 'stat':
      return styles.badgeStat;
    default:
      return styles.badgeRoutine;
  }
}

function prefixDr(name: string): string {
  if (!name) return 'Veterinarian';
  return name.trim().toLowerCase().startsWith('dr') ? name : `Dr. ${name}`;
}

function speciesLabel(s: string): string {
  if (!s) return 'Pet';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------------------------
// Subsections
// ----------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTick} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function TextSection({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

interface TreatmentPlanPDFProps {
  data: TreatmentPlanPdfData;
}

export function TreatmentPlanPDF({ data }: TreatmentPlanPDFProps) {
  const { draft, header, planNumber, finalizedDate, consultationId } = data;
  const hasMeds = draft.medications.some((m) => m.name.trim().length > 0);
  const hasLabs = draft.lab_tests.some((t) => t.name.trim().length > 0);
  const hasFollowUp = draft.follow_up.mode !== 'none';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER BAND ----------------------------------------------------- */}
        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.logo} src="/assets/logo/furrie-logo-dark-blue.png" />
            <View>
              <Text style={styles.headerLabel}>Veterinary Document</Text>
              <Text style={styles.headerTitle}>Treatment Plan</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMetaStrong}>{planNumber}</Text>
            <Text style={styles.headerMeta}>{finalizedDate}</Text>
          </View>
        </View>
        <View style={styles.accentStripe} />

        {/* META GRID ------------------------------------------------------- */}
        <View style={styles.metaGrid}>
          {/* Vet card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaCardTitle}>Veterinarian</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Name</Text>
              <Text style={styles.metaValue}>{prefixDr(header.vet.name)}</Text>
            </View>
            {header.vet.vciNumber && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>VCI Reg.</Text>
                <Text style={styles.metaValue}>{header.vet.vciNumber}</Text>
              </View>
            )}
            {header.vet.qualifications && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Qualifications</Text>
                <Text style={styles.metaValue}>{header.vet.qualifications}</Text>
              </View>
            )}
            {header.vet.specializations && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Specialization</Text>
                <Text style={styles.metaValue}>{header.vet.specializations}</Text>
              </View>
            )}
          </View>

          {/* Pet + Owner card */}
          <View style={styles.metaCard}>
            <Text style={styles.metaCardTitle}>Patient</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Name</Text>
              <Text style={styles.metaValue}>{header.pet.name}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Species</Text>
              <Text style={styles.metaValue}>
                {speciesLabel(header.pet.species)}
                {header.pet.breed ? ` · ${header.pet.breed}` : ''}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Age</Text>
              <Text style={styles.metaValue}>
                {header.pet.ageDisplay}
                {header.pet.weight ? ` · ${header.pet.weight}` : ''}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Parent</Text>
              <Text style={styles.metaValue}>
                {header.owner.name}
                {header.owner.phone ? ` · ${header.owner.phone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* OBSERVATIONS ---------------------------------------------------- */}
        <TextSection title="Observations" body={draft.observations} />

        {/* DIAGNOSIS ------------------------------------------------------- */}
        {draft.diagnosis?.trim() && (
          <View style={styles.diagnosisBox}>
            <Text style={styles.diagnosisLabel}>Diagnosis</Text>
            <Text style={styles.diagnosisText}>{draft.diagnosis}</Text>
          </View>
        )}

        {/* LAB TESTS ------------------------------------------------------- */}
        {hasLabs && (
          <View style={styles.section}>
            <SectionHeader title="Recommended Lab Tests" />
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.labCol1]}>Test</Text>
                <Text style={[styles.tableHeaderCell, styles.labCol2]}>Urgency</Text>
                <Text style={[styles.tableHeaderCell, styles.labCol3]}>Rationale / Instructions</Text>
              </View>
              {draft.lab_tests
                .filter((t) => t.name.trim().length > 0)
                .map((t, idx) => (
                  <View
                    key={`lab-${idx}`}
                    style={[
                      styles.tableRow,
                      idx % 2 === 1 ? styles.tableRowZebra : {},
                    ]}
                  >
                    <Text style={[styles.tableCellStrong, styles.labCol1]}>{t.name}</Text>
                    <View style={styles.labCol2}>
                      <Text style={[styles.badge, urgencyStyle(t.urgency)]}>
                        {t.urgency.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.tableCell, styles.labCol3]}>
                      {[t.rationale, t.instructions].filter(Boolean).join(' — ') || '—'}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* MEDICATIONS ----------------------------------------------------- */}
        {hasMeds && (
          <View style={styles.section}>
            <SectionHeader title="Medications" />
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.medCol1]}>Medication</Text>
                <Text style={[styles.tableHeaderCell, styles.medCol2]}>Dose</Text>
                <Text style={[styles.tableHeaderCell, styles.medCol3]}>Route</Text>
                <Text style={[styles.tableHeaderCell, styles.medCol4]}>Frequency</Text>
                <Text style={[styles.tableHeaderCell, styles.medCol5]}>Duration</Text>
                <Text style={[styles.tableHeaderCell, styles.medCol6]}>Instructions</Text>
              </View>
              {draft.medications
                .filter((m) => m.name.trim().length > 0)
                .map((m, idx) => (
                  <View
                    key={`med-${idx}`}
                    style={[
                      styles.tableRow,
                      idx % 2 === 1 ? styles.tableRowZebra : {},
                    ]}
                  >
                    <Text style={[styles.tableCellStrong, styles.medCol1]}>{m.name}</Text>
                    <Text style={[styles.tableCell, styles.medCol2]}>{m.dosage || '—'}</Text>
                    <Text style={[styles.tableCell, styles.medCol3]}>
                      {ROUTE_LABELS[m.route] ?? m.route}
                    </Text>
                    <Text style={[styles.tableCell, styles.medCol4]}>{m.frequency || '—'}</Text>
                    <Text style={[styles.tableCell, styles.medCol5]}>{m.duration || '—'}</Text>
                    <Text style={[styles.tableCell, styles.medCol6]}>{m.instructions || '—'}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* DIET & HOME CARE ----------------------------------------------- */}
        <TextSection title="Diet & Nutrition" body={draft.diet_nutrition} />
        <TextSection title="Home Care & Lifestyle" body={draft.home_care} />

        {/* WARNING SIGNS --------------------------------------------------- */}
        {draft.warning_signs?.trim() && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Warning Signs to Watch</Text>
            <Text style={styles.warningText}>{draft.warning_signs}</Text>
          </View>
        )}

        {/* FOLLOW-UP ------------------------------------------------------- */}
        {hasFollowUp && (
          <View style={styles.section}>
            <SectionHeader title="Follow-up Plan" />
            <View style={styles.followUpRow}>
              <Text style={styles.followUpPill}>
                {MODE_LABELS[draft.follow_up.mode] ?? draft.follow_up.mode}
              </Text>
              {draft.follow_up.timeframe && (
                <Text style={styles.followUpPill}>{draft.follow_up.timeframe}</Text>
              )}
            </View>
            {draft.follow_up.notes && (
              <Text style={styles.sectionBody}>{draft.follow_up.notes}</Text>
            )}
          </View>
        )}

        {/* IN-PERSON REFERRAL --------------------------------------------- */}
        <TextSection title="In-person Referral" body={draft.in_person_advisory} />

        {/* CUSTOM SECTIONS ------------------------------------------------- */}
        {draft.custom_sections
          .slice()
          .sort((a, b) => a.order - b.order)
          .filter((s) => s.title.trim() && s.body.trim())
          .map((s, idx) => (
            <TextSection key={`cs-${idx}`} title={s.title} body={s.body} />
          ))}

        {/* DISCLAIMER ------------------------------------------------------ */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
        </View>

        {/* FOOTER ---------------------------------------------------------- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{FOOTER_TEXT}</Text>
          <Text style={styles.footerText}>Consultation: {consultationId.slice(0, 8)}</Text>
        </View>
      </Page>
    </Document>
  );
}
