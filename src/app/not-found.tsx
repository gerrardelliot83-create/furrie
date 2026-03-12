import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--color-bg-secondary, #f5f5f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-tertiary, #999)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-text-primary, #1a1a1a)',
          marginBottom: '0.5rem',
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          fontSize: '1rem',
          color: 'var(--color-text-secondary, #666)',
          marginBottom: '2rem',
          maxWidth: '400px',
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'white',
          backgroundColor: 'var(--color-primary, #1E5081)',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
