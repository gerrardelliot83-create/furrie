import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseAdmin
    .from('pets')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: `${data?.name || 'Patient'} - Vet Portal`,
  };
}

function calculateAge(dateOfBirth: string | null, approximateAgeMonths: number | null): string {
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (totalMonths < 12) {
      return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    }
    const yrs = Math.floor(totalMonths / 12);
    return `${yrs} year${yrs !== 1 ? 's' : ''}`;
  }
  if (approximateAgeMonths) {
    if (approximateAgeMonths < 12) {
      return `~${approximateAgeMonths} month${approximateAgeMonths !== 1 ? 's' : ''}`;
    }
    const yrs = Math.floor(approximateAgeMonths / 12);
    return `~${yrs} year${yrs !== 1 ? 's' : ''}`;
  }
  return 'Unknown';
}

export default async function VetPatientDetailPage({ params }: PageProps) {
  const { id: petId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  // Verify vet has consulted this pet
  const { count: consultationCount } = await supabaseAdmin
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .eq('vet_id', user.id)
    .eq('pet_id', petId);

  if (!consultationCount || consultationCount === 0) {
    notFound();
  }

  // Fetch pet, owner, and consultations in parallel
  const [petResult, consultationsResult] = await Promise.all([
    supabaseAdmin.from('pets').select('*').eq('id', petId).single(),
    supabaseAdmin
      .from('consultations')
      .select(`
        id, consultation_number, status, outcome, scheduled_at, created_at,
        started_at, ended_at, concern_text, symptom_categories,
        soap_notes (id, provisional_diagnosis),
        prescriptions (id, prescription_number, pdf_url)
      `)
      .eq('vet_id', user.id)
      .eq('pet_id', petId)
      .order('created_at', { ascending: false }),
  ]);

  if (petResult.error || !petResult.data) {
    notFound();
  }

  const pet = mapPetFromDB(petResult.data);
  const consultations = consultationsResult.data || [];

  // Fetch owner info
  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', pet.ownerId)
    .single();

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className={styles.container}>
      <Link href="/patients" className={styles.backLink}>
        ← Back to Patients
      </Link>

      {/* Pet Header */}
      <div className={styles.petHeader}>
        <div className={styles.petAvatar}>
          {pet.photoUrls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photoUrls[0]} alt={pet.name} className={styles.petImage} />
          ) : (
            <span className={styles.petInitial}>
              {pet.species === 'dog' ? 'D' : 'C'}
            </span>
          )}
        </div>
        <div className={styles.petHeaderInfo}>
          <h1 className={styles.petName}>{pet.name}</h1>
          <p className={styles.petSpecies}>
            {pet.species === 'dog' ? 'Dog' : 'Cat'} - {pet.breed}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <dt>Age</dt>
                <dd>{calculateAge(pet.dateOfBirth, pet.approximateAgeMonths)}</dd>
              </div>
              <div className={styles.infoItem}>
                <dt>Gender</dt>
                <dd>{pet.gender === 'male' ? 'Male' : 'Female'}</dd>
              </div>
              {pet.weightKg && (
                <div className={styles.infoItem}>
                  <dt>Weight</dt>
                  <dd>{pet.weightKg} kg</dd>
                </div>
              )}
              <div className={styles.infoItem}>
                <dt>Neutered/Spayed</dt>
                <dd>{pet.isNeutered ? 'Yes' : 'No'}</dd>
              </div>
              {pet.colorMarkings && (
                <div className={styles.infoItem}>
                  <dt>Color</dt>
                  <dd>{pet.colorMarkings}</dd>
                </div>
              )}
              {pet.microchipNumber && (
                <div className={styles.infoItem}>
                  <dt>Microchip</dt>
                  <dd>{pet.microchipNumber}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Owner Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pet Parent</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <dt>Name</dt>
                <dd>{owner?.full_name || 'Unknown'}</dd>
              </div>
              {owner?.phone && (
                <div className={styles.infoItem}>
                  <dt>Phone</dt>
                  <dd>{owner.phone}</dd>
                </div>
              )}
              {owner?.email && (
                <div className={styles.infoItem}>
                  <dt>Email</dt>
                  <dd>{owner.email}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Health Info */}
        {(pet.knownAllergies.length > 0 || pet.existingConditions.length > 0 || pet.currentMedications.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Health Information</CardTitle>
            </CardHeader>
            <CardContent>
              {pet.knownAllergies.length > 0 && (
                <div className={styles.healthSection}>
                  <h4 className={styles.healthLabel}>Allergies</h4>
                  <div className={styles.tagList}>
                    {pet.knownAllergies.map((allergy, i) => (
                      <Badge key={i} variant="error">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {pet.existingConditions.length > 0 && (
                <div className={styles.healthSection}>
                  <h4 className={styles.healthLabel}>Conditions</h4>
                  <div className={styles.tagList}>
                    {pet.existingConditions.map((cond, i) => (
                      <Badge key={i} variant="warning">{cond}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {pet.currentMedications.length > 0 && (
                <div className={styles.healthSection}>
                  <h4 className={styles.healthLabel}>Current Medications</h4>
                  {pet.currentMedications.map((med, i) => (
                    <p key={i} className={styles.medicationItem}>
                      <strong>{med.name}</strong> - {med.dosage} ({med.frequency})
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vaccination History */}
        {pet.vaccinationHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vaccination History</CardTitle>
            </CardHeader>
            <CardContent>
              {pet.vaccinationHistory.map((vax, i) => (
                <div key={i} className={styles.vaccinationItem}>
                  <div className={styles.vaccinationRow}>
                    <span className={styles.vaccinationName}>{vax.name}</span>
                    {vax.status === 'approved' && <Badge variant="success">Verified</Badge>}
                    {vax.status === 'pending_approval' && <Badge variant="warning">Pending</Badge>}
                  </div>
                  <span className={styles.vaccinationDate}>
                    Given: {new Date(vax.date).toLocaleDateString('en-IN')}
                    {vax.nextDueDate && <> | Due: {new Date(vax.nextDueDate).toLocaleDateString('en-IN')}</>}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Diet Info */}
        {(pet.dietType || pet.dietDetails) && (
          <Card>
            <CardHeader>
              <CardTitle>Diet</CardTitle>
            </CardHeader>
            <CardContent>
              {pet.dietType && <p className={styles.dietText}>Type: {pet.dietType}</p>}
              {pet.dietDetails && <p className={styles.dietText}>{pet.dietDetails}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Consultation History */}
      <section className={styles.historySection}>
        <h2 className={styles.historyTitle}>
          Consultation History ({consultations.length})
        </h2>

        {consultations.length > 0 ? (
          <div className={styles.historyList}>
            {consultations.map((consultation) => {
              const displayDate = consultation.scheduled_at
                ? new Date(consultation.scheduled_at)
                : new Date(consultation.created_at);
              const soapNote = consultation.soap_notes?.[0];
              const prescription = consultation.prescriptions?.[0];

              return (
                <Link
                  key={consultation.id}
                  href={`/consultations/${consultation.id}`}
                  className={styles.historyCard}
                >
                  <div className={styles.historyCardHeader}>
                    <span className={styles.historyDate} suppressHydrationWarning>
                      {dateFormatter.format(displayDate)}
                    </span>
                    <Badge variant={getStatusVariant(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}>
                      {getStatusDisplayText(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}
                    </Badge>
                  </div>
                  <p className={styles.historyNumber}>{consultation.consultation_number}</p>
                  {consultation.concern_text && (
                    <p className={styles.historyConcern}>{consultation.concern_text}</p>
                  )}
                  {soapNote && (
                    <p className={styles.historyDiagnosis}>
                      Dx: {(soapNote as { provisional_diagnosis?: string }).provisional_diagnosis || 'See notes'}
                    </p>
                  )}
                  <div className={styles.historyMeta}>
                    {soapNote && <span className={styles.historyTag}>SOAP</span>}
                    {prescription && <span className={styles.historyTag}>Rx</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className={styles.noHistory}>No consultation history.</p>
        )}
      </section>
    </div>
  );
}
