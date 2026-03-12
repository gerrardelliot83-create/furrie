import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Privacy Policy</h1>
      <p style={{ color: '#666', lineHeight: 1.6 }}>
        Our privacy policy is being prepared and will be available here soon.
        For any questions, please contact us at support@furrie.in.
      </p>
    </div>
  );
}
