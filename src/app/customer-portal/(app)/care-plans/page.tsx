import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { CarePlanList } from './CarePlanList';
import styles from './CarePlanList.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: `${t('carePlans')} — Furrie`,
  };
}

interface CarePlanFromDB {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  pet_id: string;
  totalSteps: number;
  completedSteps: number;
  care_plan_steps: Array<{ id: string; status: string }>;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    photo_urls: string[];
  } | null;
  vet: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface PetOption {
  id: string;
  name: string;
  species: string;
}

export default async function CarePlansPage() {
  const t = await getTranslations('common');
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user's care plans with pet + vet info
  const { data: plansRaw } = await supabase
    .from('care_plans')
    .select(`
      *,
      care_plan_steps (id, status),
      pets!care_plans_pet_id_fkey (id, name, species, breed, photo_urls),
      vet:profiles!care_plans_vet_id_fkey (id, full_name, avatar_url)
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  // Add step progress counts
  const plans: CarePlanFromDB[] = (plansRaw || []).map((plan) => {
    const steps = plan.care_plan_steps || [];
    const totalSteps = steps.length;
    const completedSteps = steps.filter(
      (s: { status: string }) => s.status === 'completed'
    ).length;
    return {
      ...plan,
      totalSteps,
      completedSteps,
    } as CarePlanFromDB;
  });

  // Fetch user's pets for filter dropdown
  const { data: petsRaw } = await supabase
    .from('pets')
    .select('id, name, species')
    .eq('owner_id', user.id)
    .order('name');

  const pets: PetOption[] = (petsRaw || []).map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('carePlans')}</h1>
      </header>
      <CarePlanList initialPlans={plans} pets={pets} />
    </div>
  );
}
