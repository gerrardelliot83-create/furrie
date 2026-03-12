import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Terms of Service</h1>
      <p style={{ color: '#666', lineHeight: 1.6 }}>
        Our terms of service are being prepared and will be available here soon.
        For any questions, please contact us at support@furrie.in.
      </p>
    </div>
  );
}
