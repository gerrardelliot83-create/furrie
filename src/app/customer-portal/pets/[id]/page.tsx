import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { mapPetFromDB } from '@/lib/utils/petMapper';
import { calculateAge, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

interface PetDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PetDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('pets')
    .select('name')
    .eq('id', id)
    .single();

  return {
    title: data?.name || 'Pet Profile',
  };
}

export default async function PetDetailPage({ params }: PetDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations('pets');
  const tCommon = await getTranslations('common');
  const supabase = await createClient();

  // Fetch pet
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const pet = mapPetFromDB(data);

  // Calculate age
  let ageDisplay = 'Unknown';
  if (pet.dateOfBirth) {
    const { years, months } = calculateAge(pet.dateOfBirth);
    if (years > 0) {
      ageDisplay = months > 0 ? `${years} years, ${months} months` : `${years} years`;
    } else {
      ageDisplay = `${months} months`;
    }
  } else if (pet.approximateAgeMonths) {
    const years = Math.floor(pet.approximateAgeMonths / 12);
    const months = pet.approximateAgeMonths % 12;
    if (years > 0) {
      ageDisplay = months > 0 ? `${years} years, ${months} months` : `${years} years`;
    } else {
      ageDisplay = `${months} months`;
    }
  }

  const primaryPhoto = pet.photoUrls?.[0];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/pets" className={styles.backButton} aria-label="Back to pets">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className={styles.title}>{pet.name}</h1>
        <Link href={`/pets/${pet.id}/edit`}>
          <Button variant="secondary" size="sm">{tCommon('edit')}</Button>
        </Link>
      </div>

      {/* Photo Gallery */}
      {pet.photoUrls && pet.photoUrls.length > 0 && (
        <div className={styles.gallery}>
          <div className={styles.mainPhoto}>
            <Image
              src={primaryPhoto!}
              alt={pet.name}
              width={400}
              height={400}
              className={styles.mainImage}
              priority
            />
          </div>
          {pet.photoUrls.length > 1 && (
            <div className={styles.thumbnails}>
              {pet.photoUrls.slice(1).map((url, index) => (
                <Image
                  key={index}
                  src={url}
                  alt={`${pet.name} photo ${index + 2}`}
                  width={80}
                  height={80}
                  className={styles.thumbnail}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <dt>Species</dt>
              <dd>{t(pet.species)}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Breed</dt>
              <dd>{pet.breed}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Age</dt>
              <dd>{ageDisplay}</dd>
            </div>
            <div className={styles.infoItem}>
              <dt>Gender</dt>
              <dd>
                <Badge variant={pet.gender === 'male' ? 'info' : 'warning'}>
                  {t(pet.gender)}
                </Badge>
              </dd>
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
                <dt>Color/Markings</dt>
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

      {/* Health Info */}
      {(pet.knownAllergies.length > 0 || pet.existingConditions.length > 0 || pet.currentMedications.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Health Information</CardTitle>
          </CardHeader>
          <CardContent>
            {pet.knownAllergies.length > 0 && (
              <div className={styles.healthSection}>
                <h4 className={styles.healthLabel}>{t('allergies')}</h4>
                <div className={styles.tagList}>
                  {pet.knownAllergies.map((allergy, index) => (
                    <Badge key={index} variant="error">{allergy}</Badge>
                  ))}
                </div>
              </div>
            )}
            {pet.existingConditions.length > 0 && (
              <div className={styles.healthSection}>
                <h4 className={styles.healthLabel}>{t('conditions')}</h4>
                <div className={styles.tagList}>
                  {pet.existingConditions.map((condition, index) => (
                    <Badge key={index} variant="warning">{condition}</Badge>
                  ))}
                </div>
              </div>
            )}
            {pet.currentMedications.length > 0 && (
              <div className={styles.healthSection}>
                <h4 className={styles.healthLabel}>{t('medications')}</h4>
                <div className={styles.medicationList}>
                  {pet.currentMedications.map((med, index) => (
                    <div key={index} className={styles.medicationItem}>
                      <span className={styles.medicationName}>{med.name}</span>
                      <span className={styles.medicationDetails}>
                        {med.dosage} - {med.frequency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vaccinations */}
      {pet.vaccinationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('vaccinations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.vaccinationList}>
              {pet.vaccinationHistory.map((vax, index) => (
                <div key={index} className={styles.vaccinationItem}>
                  <div className={styles.vaccinationHeader}>
                    <span className={styles.vaccinationName}>{vax.name}</span>
                    {vax.status === 'approved' && (
                      <Badge variant="success">Verified</Badge>
                    )}
                    {vax.status === 'pending_approval' && (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    {vax.status === 'rejected' && (
                      <Badge variant="error">Rejected</Badge>
                    )}
                  </div>
                  <div className={styles.vaccinationDetails}>
                    <span>Given: {formatDate(vax.date)}</span>
                    {vax.nextDueDate && (
                      <span>Due: {formatDate(vax.nextDueDate)}</span>
                    )}
                    {vax.administeredBy && (
                      <span>By: {vax.administeredBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Documents */}
      {pet.medicalDocsUrls && pet.medicalDocsUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('medicalDocs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.docList}>
              {pet.medicalDocsUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.docItem}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Document {index + 1}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diet & Insurance */}
      {(pet.dietType || pet.insuranceProvider) && (
        <Card>
          <CardHeader>
            <CardTitle>Other Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={styles.infoGrid}>
              {pet.dietType && (
                <div className={styles.infoItem}>
                  <dt>{t('diet')}</dt>
                  <dd>{pet.dietType}</dd>
                </div>
              )}
              {pet.dietDetails && (
                <div className={styles.infoItem}>
                  <dt>Diet Details</dt>
                  <dd>{pet.dietDetails}</dd>
                </div>
              )}
              {pet.insuranceProvider && (
                <div className={styles.infoItem}>
                  <dt>Insurance Provider</dt>
                  <dd>{pet.insuranceProvider}</dd>
                </div>
              )}
              {pet.insurancePolicyNumber && (
                <div className={styles.infoItem}>
                  <dt>Policy Number</dt>
                  <dd>{pet.insurancePolicyNumber}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
