'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import styles from './page.module.css';

type RequestStatus = 'all' | 'pending' | 'contacted' | 'fulfilled' | 'cancelled';

interface CreditRequest {
  id: string;
  customer_id: string;
  quantity_requested: number;
  contact_preference: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  fulfilled_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return styles.badgePending;
    case 'contacted':
      return styles.badgeContacted;
    case 'fulfilled':
      return styles.badgeFulfilled;
    case 'cancelled':
      return styles.badgeCancelled;
    default:
      return styles.badgePending;
  }
}

export default function CreditRequestsPage() {
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('all');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await fetch(`/api/admin/consultation-requests${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }

      setRequests(data.requests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: 'contact' | 'fulfill' | 'cancel') => {
    if (action === 'cancel' && !window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    setActionLoading(requestId);
    try {
      const body: Record<string, string> = { requestId, action };

      // For fulfill, we need to create a pack first
      if (action === 'fulfill') {
        const req = requests.find((r) => r.id === requestId);
        if (!req) return;

        // Create a consultation pack for the customer
        const packResponse = await fetch('/api/admin/consultation-packs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: req.customer_id,
            totalCount: req.quantity_requested,
            source: 'admin_grant',
          }),
        });

        const packData = await packResponse.json();
        if (!packResponse.ok) {
          throw new Error(packData.error || 'Failed to create pack');
        }

        body.packId = packData.pack.id;
      }

      const response = await fetch('/api/admin/consultation-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      // Refresh the list
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const statusOptions: { value: RequestStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Credit Requests
          {!loading && <span className={styles.count}> ({requests.length})</span>}
        </h1>
      </div>

      <div className={styles.filters}>
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(styles.filterButton, statusFilter === option.value && styles.filterButtonActive)}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p>{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No credit requests found</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Contact Pref.</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Fulfilled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>
                  <div className={styles.customerName}>
                    {req.profiles?.full_name || 'Unknown'}
                  </div>
                  <div className={styles.customerEmail}>
                    {req.profiles?.email || '-'}
                  </div>
                  {(req.phone || req.profiles?.phone) && (
                    <div className={styles.customerPhone}>
                      {req.phone || req.profiles?.phone}
                    </div>
                  )}
                </td>
                <td>{req.quantity_requested}</td>
                <td>
                  <span className={styles.preference}>
                    {req.contact_preference || '-'}
                  </span>
                </td>
                <td>
                  <span className={styles.notes} title={req.notes || undefined}>
                    {req.notes || '-'}
                  </span>
                </td>
                <td>
                  <span className={cn(styles.badge, getStatusBadgeClass(req.status))}>
                    {req.status}
                  </span>
                </td>
                <td>{formatDateTime(req.created_at)}</td>
                <td>{formatDateTime(req.fulfilled_at)}</td>
                <td>
                  <div className={styles.actions}>
                    {req.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className={cn(styles.actionButton, styles.contactButton)}
                          onClick={() => handleAction(req.id, 'contact')}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? '...' : 'Contact'}
                        </button>
                        <button
                          type="button"
                          className={cn(styles.actionButton, styles.fulfillButton)}
                          onClick={() => handleAction(req.id, 'fulfill')}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? '...' : 'Fulfill'}
                        </button>
                        <button
                          type="button"
                          className={cn(styles.actionButton, styles.cancelButton)}
                          onClick={() => handleAction(req.id, 'cancel')}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? '...' : 'Cancel'}
                        </button>
                      </>
                    )}
                    {req.status === 'contacted' && (
                      <>
                        <button
                          type="button"
                          className={cn(styles.actionButton, styles.fulfillButton)}
                          onClick={() => handleAction(req.id, 'fulfill')}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? '...' : 'Fulfill'}
                        </button>
                        <button
                          type="button"
                          className={cn(styles.actionButton, styles.cancelButton)}
                          onClick={() => handleAction(req.id, 'cancel')}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? '...' : 'Cancel'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
