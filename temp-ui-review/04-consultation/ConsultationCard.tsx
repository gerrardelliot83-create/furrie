// ConsultationCard.tsx - Consultation Card for History/List Views
// Copy this file to Claude Desktop and ask: "Please render this as a React artifact"

const styles = {
  container: {
    fontFamily: "'Epilogue', -apple-system, sans-serif",
    padding: '24px',
    backgroundColor: '#F9F6E8',
    minHeight: '100vh',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  // Consultation card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #E5E7EB',
    width: '320px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cardHover: {
    borderColor: '#1E5081',
    boxShadow: '0 4px 12px rgba(48, 51, 68, 0.08)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  petSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  petAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600,
    color: '#303344',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 2px 0',
  },
  petBreed: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
  },
  // Status badges
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusScheduled: {
    backgroundColor: '#DBEAFE',
    color: '#1E5081',
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
    color: '#CE3E24',
  },
  statusPaymentPending: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  // Card body
  cardBody: {
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  dateTime: {
    fontSize: '13px',
    color: '#6B7280',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  summary: {
    fontSize: '14px',
    color: '#464A5C',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  // Tags/symptoms
  tags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '12px',
  },
  tag: {
    padding: '4px 10px',
    backgroundColor: '#F2EAC3',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#303344',
  },
  // Vet info
  vetInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  vetAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: '#464A5C',
  },
  vetName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#303344',
    margin: 0,
  },
  vetLabel: {
    fontSize: '11px',
    color: '#6B7280',
    margin: 0,
  },
  // Card actions
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  actionButton: {
    flex: 1,
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  actionPrimary: {
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
  },
  actionSecondary: {
    backgroundColor: 'transparent',
    color: '#1E5081',
    border: '1px solid #1E5081',
  },
  actionAccent: {
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    border: 'none',
  },
  // Follow-up badge
  followUpBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#D1FAE5',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#059669',
    marginTop: '12px',
  },
};

export default function ConsultationCard() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Consultation Card Components
      </h1>

      {/* Completed Consultations */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Completed Consultations</h2>
        <div style={styles.row}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>M</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Max</h4>
                  <p style={styles.petBreed}>Golden Retriever</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusCompleted }}>Completed</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128197;</span>
                Jan 15, 2026 at 2:30 PM
              </p>
              <p style={styles.summary}>
                General checkup - All vitals normal. Recommended monthly deworming schedule.
              </p>
              <div style={styles.vetInfo}>
                <div style={styles.vetAvatar}>DR</div>
                <div>
                  <p style={styles.vetName}>Dr. Rahul Singh</p>
                  <p style={styles.vetLabel}>Veterinarian</p>
                </div>
              </div>
            </div>
          </div>

          {/* With Follow-up Available */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>B</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Bella</h4>
                  <p style={styles.petBreed}>Persian Cat</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusCompleted }}>Completed</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128197;</span>
                Jan 12, 2026 at 11:00 AM
              </p>
              <p style={styles.summary}>
                Skin irritation consultation - Prescribed medicated shampoo and follow-up recommended.
              </p>
              <div style={styles.followUpBadge}>
                <span>&#9200;</span>
                Free follow-up available (5 days left)
              </div>
              <div style={styles.cardActions}>
                <button style={{ ...styles.actionButton, ...styles.actionSecondary }}>View Details</button>
                <button style={{ ...styles.actionButton, ...styles.actionPrimary }}>Follow Up</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled/Upcoming */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Scheduled Consultations</h2>
        <div style={styles.row}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>M</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Max</h4>
                  <p style={styles.petBreed}>Golden Retriever</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusScheduled }}>Scheduled</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128197;</span>
                Today at 4:00 PM
              </p>
              <div style={styles.tags}>
                <span style={styles.tag}>Loss of appetite</span>
                <span style={styles.tag}>Lethargy</span>
              </div>
              <div style={styles.cardActions}>
                <button style={{ ...styles.actionButton, ...styles.actionSecondary }}>Reschedule</button>
                <button style={{ ...styles.actionButton, ...styles.actionAccent }}>Join Call</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In Progress */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>In Progress</h2>
        <div style={styles.row}>
          <div style={{ ...styles.card, ...styles.cardHover }}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>R</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Rocky</h4>
                  <p style={styles.petBreed}>German Shepherd</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusInProgress }}>In Progress</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128339;</span>
                Started 5 min ago
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#FEF3C7',
                borderRadius: '8px',
                marginTop: '8px',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#D97706',
                  animation: 'pulse 2s infinite',
                }}></div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#D97706' }}>Consultation in progress</span>
              </div>
              <div style={styles.cardActions}>
                <button style={{ ...styles.actionButton, ...styles.actionAccent, width: '100%' }}>Rejoin Call</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Pending */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Payment Pending</h2>
        <div style={styles.row}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>B</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Bella</h4>
                  <p style={styles.petBreed}>Persian Cat</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusPaymentPending }}>Payment Due</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128197;</span>
                Booked for Jan 18, 2026
              </p>
              <div style={styles.tags}>
                <span style={styles.tag}>Vaccination</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                marginTop: '8px',
              }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Consultation fee</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#303344' }}>Rs. 499</span>
              </div>
              <div style={styles.cardActions}>
                <button style={{ ...styles.actionButton, ...styles.actionPrimary, width: '100%' }}>Pay Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancelled */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Cancelled</h2>
        <div style={styles.row}>
          <div style={{ ...styles.card, opacity: 0.7 }}>
            <div style={styles.cardHeader}>
              <div style={styles.petSection}>
                <div style={styles.petAvatar}>M</div>
                <div style={styles.petInfo}>
                  <h4 style={styles.petName}>Max</h4>
                  <p style={styles.petBreed}>Golden Retriever</p>
                </div>
              </div>
              <span style={{ ...styles.statusBadge, ...styles.statusCancelled }}>Cancelled</span>
            </div>
            <div style={styles.cardBody}>
              <p style={styles.dateTime}>
                <span>&#128197;</span>
                Jan 10, 2026 at 3:00 PM
              </p>
              <p style={{ fontSize: '13px', color: '#CE3E24', margin: 0 }}>
                Cancelled by customer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact List View */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Compact List View (Mobile)</h2>
        <div style={{ maxWidth: '320px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          {[
            { pet: 'Max', date: 'Today', status: 'Scheduled', statusStyle: styles.statusScheduled },
            { pet: 'Bella', date: 'Jan 15', status: 'Completed', statusStyle: styles.statusCompleted },
            { pet: 'Rocky', date: 'Jan 12', status: 'Completed', statusStyle: styles.statusCompleted },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#F2EAC3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 600,
                color: '#303344',
              }}>{item.pet[0]}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#303344', margin: '0 0 2px 0' }}>{item.pet}</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{item.date}</p>
              </div>
              <span style={{ ...styles.statusBadge, ...item.statusStyle }}>{item.status}</span>
              <span style={{ color: '#9CA3AF', fontSize: '16px' }}>{'>'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
