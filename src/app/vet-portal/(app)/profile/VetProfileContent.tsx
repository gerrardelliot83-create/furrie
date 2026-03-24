'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { TagInput } from '@/components/customer/TagInput';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.css';

interface VetDetails {
  qualifications: string;
  vci_registration_number: string;
  state_council_registration: string | null;
  specializations: string[];
  years_of_experience: number | null;
  degree_certificate_url: string | null;
  is_verified: boolean;
  is_available: boolean;
  consultation_count: number;
  average_rating: number;
}

interface VetProfileData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  vet_profiles: VetDetails[] | VetDetails | null;
}

interface VetProfileContentProps {
  profile: VetProfileData;
}

export function VetProfileContent({ profile }: VetProfileContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  // Supabase joins return arrays; extract the first element
  const vet = Array.isArray(profile.vet_profiles) ? profile.vet_profiles[0] ?? null : profile.vet_profiles;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: profile.full_name,
    phone: profile.phone || '',
    specializations: vet?.specializations || [],
    yearsOfExperience: vet?.years_of_experience?.toString() || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      setError('Full name cannot be empty');
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vet/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: formData.phone || null,
          specializations: formData.specializations,
          yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setIsEditOpen(false);
      toast('Profile updated successfully', 'success');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.container}>
      {/* Profile Header */}
      <section className={styles.profileHeader}>
        <Avatar src={profile.avatar_url} alt={profile.full_name} size="xl" />
        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{profile.full_name}</h2>
          <p className={styles.email}>{profile.email}</p>
          {profile.phone && <p className={styles.phone}>{profile.phone}</p>}
          {vet?.is_verified && (
            <span className={styles.verifiedBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Verified
            </span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
          Edit Profile
        </Button>
      </section>

      {/* Stats */}
      {vet && (
        <section className={styles.card}>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{vet.consultation_count}</span>
              <span className={styles.statLabel}>Consultations</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {vet.average_rating > 0 ? vet.average_rating.toFixed(1) : '--'}
              </span>
              <span className={styles.statLabel}>Rating</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {vet.years_of_experience ?? '--'}
              </span>
              <span className={styles.statLabel}>Years Exp.</span>
            </div>
          </div>
        </section>
      )}

      {/* Professional Details */}
      {vet && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Professional Details</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Qualifications</span>
              <span className={styles.infoValue}>{vet.qualifications}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>VCI Registration</span>
              <span className={styles.infoValue}>{vet.vci_registration_number}</span>
            </div>
            {vet.state_council_registration && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>State Council Reg.</span>
                <span className={styles.infoValue}>{vet.state_council_registration}</span>
              </div>
            )}
            {vet.specializations.length > 0 && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Specializations</span>
                <div className={styles.tagList}>
                  {vet.specializations.map((s) => (
                    <span key={s} className={styles.tag}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {memberSince && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Member Since</span>
                <span className={styles.infoValue}>{memberSince}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Quick Links</h3>
        <nav className={styles.linkList}>
          <Link href="/schedule" className={styles.link}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Manage Schedule</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link href="/consultations" className={styles.link}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Consultations</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link href="/patients" className={styles.link}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
              <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
            </svg>
            <span>Patients</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </nav>
      </section>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Profile"
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Years of Experience"
              value={formData.yearsOfExperience}
              onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
              placeholder="e.g., 5"
              type="number"
            />
          </div>
          <div className={styles.formGroup}>
            <TagInput
              label="Specializations"
              value={formData.specializations}
              onChange={(tags) => {
                setFormData((prev) => ({ ...prev, specializations: tags }));
                setError(null);
              }}
              placeholder="Type specialization and press Enter..."
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
