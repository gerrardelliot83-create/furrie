'use client';

import { useEffect } from 'react';

export default function VetPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Vet portal error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '0.75rem',
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          color: '#666',
          marginBottom: '1.5rem',
          maxWidth: '400px',
          lineHeight: 1.5,
        }}
      >
        We couldn&apos;t load this page. Please try again.
      </p>
      {error.digest && (
        <p
          style={{
            color: '#999',
            fontSize: '0.8125rem',
            fontFamily: 'monospace',
            marginBottom: '1.5rem',
          }}
        >
          Reference: {error.digest}
        </p>
      )}
      {isDev && error.message && (
        <pre
          style={{
            color: '#770002',
            fontSize: '0.8125rem',
            fontFamily: 'monospace',
            background: '#fff5f5',
            border: '1px solid #f5d7d7',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            maxWidth: '600px',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '1.5rem',
          }}
        >
          {error.message}
        </pre>
      )}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#770002',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/login"
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#f5f5f5',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
