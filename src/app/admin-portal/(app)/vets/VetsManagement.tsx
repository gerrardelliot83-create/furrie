'use client';

import { useState, type FormEvent } from 'react';
import styles from './page.module.css';

interface VetProfileRow {
  qualifications: string | null;
  vci_registration_number: string | null;
  specializations: string[] | null;
  years_of_experience: number | null;
  is_verified: boolean;
  is_available: boolean;
  consultation_count: number | null;
  average_rating: number | null;
}

interface VetRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string;
  vet_profiles: VetProfileRow[] | VetProfileRow | null;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getVetProfile(vet: VetRow): VetProfileRow | null {
  if (Array.isArray(vet.vet_profiles)) return (vet.vet_profiles[0] as VetProfileRow | undefined) ?? null;
  return vet.vet_profiles as VetProfileRow | null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function VetsManagement({ initialVets }: { initialVets: VetRow[] }) {
  const [vets, setVets] = useState<VetRow[]>(initialVets);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editVet, setEditVet] = useState<VetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function clearMessage() {
    setTimeout(() => setMessage(null), 5000);
  }

  async function refreshVets() {
    const res = await fetch('/api/admin/vets');
    if (res.ok) {
      const data = await res.json();
      setVets(data.vets);
    }
  }

  async function handleDeactivate(vet: VetRow) {
    const isActive = vet.is_active !== false;
    const action = isActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${vet.full_name}?`)) return;

    setActionLoading(vet.id);
    const res = await fetch('/api/admin/vets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vetId: vet.id, isActive: !isActive }),
    });
    const data = await res.json();
    setActionLoading(null);

    if (res.ok) {
      setMessage({ type: 'success', text: data.message });
      await refreshVets();
    } else {
      setMessage({ type: 'error', text: data.error });
    }
    clearMessage();
  }

  async function handleDelete(vet: VetRow) {
    if (!confirm(`PERMANENTLY delete ${vet.full_name} (${vet.email})?\n\nThis cannot be undone. If the vet has any consultation data, this will fail — use Deactivate instead.`)) return;

    setActionLoading(vet.id);
    const res = await fetch('/api/admin/vets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vetId: vet.id }),
    });
    const data = await res.json();
    setActionLoading(null);

    if (res.ok) {
      setMessage({ type: 'success', text: data.message });
      await refreshVets();
    } else {
      const detail = data.details
        ? `\n(${data.details.consultations} consultations, ${data.details.soapNotes} SOAP notes, ${data.details.prescriptions} prescriptions)`
        : '';
      setMessage({ type: 'error', text: data.error + detail });
    }
    clearMessage();
  }

  async function handleResetPassword(vet: VetRow) {
    if (!confirm(`Send a password reset email to ${vet.email}?`)) return;

    setActionLoading(vet.id);
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', userId: vet.id }),
    });
    const data = await res.json();
    setActionLoading(null);

    setMessage({ type: res.ok ? 'success' : 'error', text: res.ok ? data.message : data.error });
    clearMessage();
  }

  return (
    <div className={styles.container}>
      {message && (
        <div className={`${styles.toast} ${message.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {message.text}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>
          Vets <span className={styles.count}>({vets.length})</span>
        </h1>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          + Create Vet
        </button>
      </div>

      {vets.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No vets registered yet. Click &quot;Create Vet&quot; to add one.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>VCI Number</th>
              <th>Specializations</th>
              <th>Consultations</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vets.map((vet) => {
              const vp = getVetProfile(vet);
              const isInactive = vet.is_active === false;
              const isLoading = actionLoading === vet.id;

              return (
                <tr key={vet.id} style={isInactive ? { opacity: 0.5 } : undefined}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>{getInitials(vet.full_name)}</div>
                      <span>{vet.full_name || 'Unnamed'}{isInactive ? ' (Inactive)' : ''}</span>
                    </div>
                  </td>
                  <td>{vet.email}</td>
                  <td>{vp?.vci_registration_number || '-'}</td>
                  <td>
                    {vp?.specializations && vp.specializations.length > 0 ? (
                      <div className={styles.specList}>
                        {vp.specializations.slice(0, 3).map((spec) => (
                          <span key={spec} className={styles.specTag}>{spec}</span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{vp?.consultation_count ?? 0}</td>
                  <td>{vp?.average_rating ? `${vp.average_rating.toFixed(1)}/5` : '-'}</td>
                  <td>
                    <span className={`${styles.badge} ${vp?.is_available ? styles.badgeOnline : styles.badgeOffline}`}>
                      {vp?.is_available ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>{formatDate(vet.created_at)}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => setEditVet(vet)}
                        disabled={isLoading}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleDeactivate(vet)}
                        disabled={isLoading}
                        title={isInactive ? 'Reactivate' : 'Deactivate'}
                      >
                        {isLoading ? '...' : isInactive ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleResetPassword(vet)}
                        disabled={isLoading}
                        title="Send password reset email"
                      >
                        Reset Pwd
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => handleDelete(vet)}
                        disabled={isLoading}
                        title="Permanently delete (only if no data)"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showCreateModal && (
        <CreateVetModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await refreshVets();
            setMessage({ type: 'success', text: 'Vet created successfully' });
            clearMessage();
          }}
        />
      )}

      {editVet && (
        <EditVetModal
          vet={editVet}
          onClose={() => setEditVet(null)}
          onSaved={async () => {
            setEditVet(null);
            await refreshVets();
            setMessage({ type: 'success', text: 'Vet updated successfully' });
            clearMessage();
          }}
        />
      )}
    </div>
  );
}

// ─── Create Vet Modal ────────────────────────────────────────────────────────

function CreateVetModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const specsRaw = (form.get('specializations') as string).trim();

    const body = {
      email: form.get('email'),
      password: form.get('password'),
      fullName: form.get('fullName'),
      phone: form.get('phone') || undefined,
      qualifications: form.get('qualifications'),
      vciRegistrationNumber: form.get('vciRegistrationNumber'),
      specializations: specsRaw ? specsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      yearsOfExperience: form.get('yearsOfExperience') ? Number(form.get('yearsOfExperience')) : undefined,
    };

    const res = await fetch('/api/admin/vets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onCreated();
    } else {
      setError(data.error || 'Failed to create vet');
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Create Vet Account</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input name="fullName" className={styles.input} required placeholder="Dr. Priya Sharma" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email *</label>
              <input name="email" type="email" className={styles.input} required placeholder="vet@example.com" />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Password *</label>
              <input name="password" type="password" className={styles.input} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone</label>
              <input name="phone" className={styles.input} placeholder="+919876543210" />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Qualifications *</label>
              <input name="qualifications" className={styles.input} required placeholder="BVSc & AH, MVSc" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>VCI Registration # *</label>
              <input name="vciRegistrationNumber" className={styles.input} required placeholder="VCI-12345-MH" />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Specializations</label>
              <input name="specializations" className={styles.input} placeholder="Small Animals, Dermatology (comma-separated)" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Years of Experience</label>
              <input name="yearsOfExperience" type="number" className={styles.input} min={0} max={60} placeholder="5" />
            </div>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create Vet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Vet Modal ──────────────────────────────────────────────────────────

function EditVetModal({ vet, onClose, onSaved }: { vet: VetRow; onClose: () => void; onSaved: () => void }) {
  const vp = getVetProfile(vet);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const specsRaw = (form.get('specializations') as string).trim();

    const body = {
      vetId: vet.id,
      fullName: form.get('fullName') || undefined,
      phone: form.get('phone') || undefined,
      qualifications: form.get('qualifications') || undefined,
      specializations: specsRaw ? specsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      yearsOfExperience: form.get('yearsOfExperience') ? Number(form.get('yearsOfExperience')) : undefined,
      isVerified: form.get('isVerified') === 'on',
    };

    const res = await fetch('/api/admin/vets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onSaved();
    } else {
      setError(data.error || 'Failed to update vet');
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Edit Vet: {vet.full_name}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input name="fullName" className={styles.input} defaultValue={vet.full_name || ''} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Phone</label>
              <input name="phone" className={styles.input} defaultValue={vet.phone || ''} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Qualifications</label>
              <input name="qualifications" className={styles.input} defaultValue={vp?.qualifications || ''} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Specializations</label>
              <input name="specializations" className={styles.input} defaultValue={vp?.specializations?.join(', ') || ''} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Years of Experience</label>
              <input name="yearsOfExperience" type="number" className={styles.input} min={0} max={60} defaultValue={vp?.years_of_experience ?? ''} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input name="isVerified" type="checkbox" defaultChecked={vp?.is_verified ?? false} />
                Verified
              </label>
            </div>
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
