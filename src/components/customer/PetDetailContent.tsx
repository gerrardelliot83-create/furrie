'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { usePets } from '@/hooks/usePets';
import { calculateAge, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import styles from './PetDetailContent.module.css';

interface PetDetailContentProps {
  petId: string;
}

export function PetDetailContent({ petId }: PetDetailContentProps) {
  const t = useTranslations('pets');
  const { getPet } = usePets();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- Intentional: reset loading when petId changes
    setError(null);

    getPet(petId).then(({ pet: fetchedPet, error: fetchError }) => {
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError);
      } else if (fetchedPet) {
        setPet(fetchedPet);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [petId, getPet]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className={styles.error}>
        <p>Failed to load pet details.</p>
      </div>
    );
  }

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
      {/* Photo */}
      {primaryPhoto && (
        <div className={styles.photoSection}>
          <Image
            src={primaryPhoto}
            alt={pet.name}
            width={400}
            height={300}
            className={styles.photo}
          />
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
                    {vax.status === 'approved' && <Badge variant="success">Verified</Badge>}
                    {vax.status === 'pending_approval' && <Badge variant="warning">Pending</Badge>}
                    {vax.status === 'rejected' && <Badge variant="error">Rejected</Badge>}
                  </div>
                  <div className={styles.vaccinationDetails}>
                    <span>Given: {formatDate(vax.date)}</span>
                    {vax.nextDueDate && <span>Due: {formatDate(vax.nextDueDate)}</span>}
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
                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className={styles.docItem}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* View Full Profile link (navigates to full page) */}
      <div className={styles.fullProfileLink}>
        <Link href={`/pets/${pet.id}`} className={styles.link}>
          View Full Profile Page
        </Link>
      </div>
    </div>
  );
}
