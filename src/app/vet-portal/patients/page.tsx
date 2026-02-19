import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Patients - Vet Portal',
};

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function VetPatientsPage({ searchParams }: PageProps) {
  const { search: searchQuery, page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || '1', 10));

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

  // Get distinct pet IDs this vet has consulted
  // Use a raw query approach: get consultations grouped by pet
  const { data: consultationPets } = await supabaseAdmin
    .from('consultations')
    .select('pet_id')
    .eq('vet_id', user.id)
    .not('pet_id', 'is', null);

  // Get unique pet IDs
  const petIdSet = new Set<string>();
  (consultationPets || []).forEach((row) => {
    if (row.pet_id) petIdSet.add(row.pet_id);
  });
  const uniquePetIds = Array.from(petIdSet);

  if (uniquePetIds.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Patients</h1>
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No patients yet</h2>
          <p className={styles.emptyText}>
            Patients will appear here after you complete consultations.
          </p>
        </div>
      </div>
    );
  }

  // Fetch pet details for those IDs
  let petsQuery = supabaseAdmin
    .from('pets')
    .select(`
      id, name, species, breed, photo_urls, owner_id,
      profiles!pets_owner_id_fkey (id, full_name)
    `)
    .in('id', uniquePetIds)
    .order('name', { ascending: true });

  // Apply search filter
  if (searchQuery) {
    petsQuery = petsQuery.or(
      `name.ilike.%${searchQuery}%,breed.ilike.%${searchQuery}%`
    );
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  petsQuery = petsQuery.range(from, to);

  const { data: pets } = await petsQuery;

  // Count consultations per pet
  const consultationCounts: Record<string, number> = {};
  (consultationPets || []).forEach((row) => {
    if (row.pet_id) {
      consultationCounts[row.pet_id] = (consultationCounts[row.pet_id] || 0) + 1;
    }
  });

  const totalPages = Math.ceil(uniquePetIds.length / PAGE_SIZE);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Patients</h1>
        <p className={styles.subtitle}>{uniquePetIds.length} total patients</p>
      </div>

      {/* Search */}
      <form action="/patients" method="get" className={styles.searchForm}>
        <input
          type="text"
          name="search"
          placeholder="Search by pet name or breed..."
          defaultValue={searchQuery || ''}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
        {searchQuery && (
          <Link href="/patients" className={styles.clearSearch}>
            Clear
          </Link>
        )}
      </form>

      {/* Patient Grid */}
      <div className={styles.grid}>
        {(pets || []).map((pet) => {
          const owner = (Array.isArray(pet.profiles) ? pet.profiles[0] : pet.profiles) as { id: string; full_name: string } | null;
          return (
            <Link
              key={pet.id}
              href={`/patients/${pet.id}`}
              className={styles.patientCard}
            >
              <div className={styles.patientAvatar}>
                {pet.photo_urls && pet.photo_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet.photo_urls[0]}
                    alt={pet.name}
                    className={styles.patientImage}
                  />
                ) : (
                  <span className={styles.patientInitial}>
                    {pet.species === 'dog' ? 'D' : 'C'}
                  </span>
                )}
              </div>
              <div className={styles.patientInfo}>
                <h3 className={styles.patientName}>{pet.name}</h3>
                <p className={styles.patientBreed}>
                  {pet.species === 'dog' ? 'Dog' : 'Cat'} - {pet.breed || 'Unknown breed'}
                </p>
                <p className={styles.patientOwner}>
                  Owner: {owner?.full_name || 'Unknown'}
                </p>
                <p className={styles.patientConsultations}>
                  {consultationCounts[pet.id] || 0} consultation{(consultationCounts[pet.id] || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {currentPage > 1 && (
            <Link
              href={`/patients?${new URLSearchParams({
                ...(searchQuery ? { search: searchQuery } : {}),
                page: String(currentPage - 1),
              }).toString()}`}
              className={styles.paginationButton}
            >
              Previous
            </Link>
          )}
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/patients?${new URLSearchParams({
                ...(searchQuery ? { search: searchQuery } : {}),
                page: String(currentPage + 1),
              }).toString()}`}
              className={styles.paginationButton}
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
