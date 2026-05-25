'use client';

import { useState, type FormEvent } from 'react';
import styles from './page.module.css';

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string;
  pets: { id: string; name: string }[] | null;
  petCount: number;
  hasActiveSubscription: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function UsersManagement({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [packUser, setPackUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function clearMessage() {
    setTimeout(() => setMessage(null), 5000);
  }

  async function refreshUsers() {
    const res = await fetch('/api/admin/users?includeInactive=true');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }

  async function handleDeactivate(user: UserRow) {
    const isActive = user.is_active !== false;
    const action = isActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    setActionLoading(user.id);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, isActive: !isActive }),
    });
    const data = await res.json();
    setActionLoading(null);
    setMessage({ type: res.ok ? 'success' : 'error', text: res.ok ? data.message : data.error });
    if (res.ok) await refreshUsers();
    clearMessage();
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`PERMANENTLY delete ${user.full_name} (${user.email})?\n\nThis cannot be undone. If the user has any data, this will fail — use Deactivate instead.`)) return;

    setActionLoading(user.id);
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    setActionLoading(null);

    if (res.ok) {
      setMessage({ type: 'success', text: data.message });
      await refreshUsers();
    } else {
      const detail = data.details
        ? `\n(${data.details.consultations} consultations, ${data.details.payments} payments, ${data.details.subscriptions} subscriptions, ${data.details.carePlans} care plans)`
        : '';
      setMessage({ type: 'error', text: data.error + detail });
    }
    clearMessage();
  }

  async function handleResetPassword(user: UserRow) {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return;

    setActionLoading(user.id);
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', userId: user.id }),
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
          Users <span className={styles.count}>({users.length})</span>
        </h1>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          + Create User
        </button>
      </div>

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No customers registered yet.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Pets</th>
              <th>Subscription</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isInactive = user.is_active === false;
              const isLoading = actionLoading === user.id;

              return (
                <tr key={user.id} style={isInactive ? { opacity: 0.5 } : undefined}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>{getInitials(user.full_name)}</div>
                      <span>{user.full_name || 'Unnamed'}{isInactive ? ' (Inactive)' : ''}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.petCount}</td>
                  <td>
                    <span className={`${styles.badge} ${user.hasActiveSubscription ? styles.badgeActive : styles.badgeInactive}`}>
                      {user.hasActiveSubscription ? 'Plus' : 'Free'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => setPackUser(user)}
                        disabled={isLoading}
                        title="Assign consultation pack"
                      >
                        Assign Pack
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleDeactivate(user)}
                        disabled={isLoading}
                      >
                        {isLoading ? '...' : isInactive ? 'Activate' : 'Deactivate'}
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleResetPassword(user)}
                        disabled={isLoading}
                      >
                        Reset Pwd
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => handleDelete(user)}
                        disabled={isLoading}
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
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await refreshUsers();
            setMessage({ type: 'success', text: 'User created successfully' });
            clearMessage();
          }}
        />
      )}

      {packUser && (
        <AssignPackModal
          user={packUser}
          onClose={() => setPackUser(null)}
          onAssigned={async () => {
            setPackUser(null);
            setMessage({ type: 'success', text: 'Pack assigned successfully' });
            clearMessage();
          }}
        />
      )}
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      email: form.get('email'),
      password: form.get('password'),
      fullName: form.get('fullName'),
      phone: form.get('phone') || undefined,
    };

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onCreated();
    } else {
      setError(data.error || 'Failed to create user');
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Create Customer Account</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name *</label>
              <input name="fullName" className={styles.input} required placeholder="John Doe" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email *</label>
              <input name="email" type="email" className={styles.input} required placeholder="customer@example.com" />
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

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Pack Modal ───────────────────────────────────────────────────────

function AssignPackModal({ user, onClose, onAssigned }: { user: UserRow; onClose: () => void; onAssigned: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [packSize, setPackSize] = useState<3 | 5 | 10>(3);

  const packOptions = [
    { size: 3 as const, price: 807, discount: '10%', perConsult: 269 },
    { size: 5 as const, price: 1121, discount: '25%', perConsult: 224 },
    { size: 10 as const, price: 1495, discount: '50%', perConsult: 150 },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/consultation-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: user.id, totalCount: packSize }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onAssigned();
    } else {
      setError(data.error || 'Failed to assign pack');
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Assign Pack to {user.full_name}</h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
          {user.email}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.packOptions}>
            {packOptions.map((opt) => (
              <label
                key={opt.size}
                className={`${styles.packOption} ${packSize === opt.size ? styles.packOptionSelected : ''}`}
              >
                <input
                  type="radio"
                  name="packSize"
                  value={opt.size}
                  checked={packSize === opt.size}
                  onChange={() => setPackSize(opt.size)}
                  style={{ display: 'none' }}
                />
                <span className={styles.packSize}>{opt.size} Consultations</span>
                <span className={styles.packDiscount}>{opt.discount} off</span>
                <span className={styles.packPrice}>&#8377;{opt.price}</span>
                <span className={styles.packPerUnit}>&#8377;{opt.perConsult}/consultation</span>
              </label>
            ))}
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Assigning...' : `Assign ${packSize}-Pack`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
