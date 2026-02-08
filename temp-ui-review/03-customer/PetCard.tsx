// PetCard.tsx - Pet Card Component for Customer Portal
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
    marginBottom: '16px',
  },
  // Pet card base
  petCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #E5E7EB',
    width: '280px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  petCardHover: {
    borderColor: '#1E5081',
    boxShadow: '0 4px 12px rgba(48, 51, 68, 0.1)',
  },
  petCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  petAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: '#303344',
    flexShrink: 0,
  },
  petAvatarImg: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
    backgroundColor: '#F2EAC3',
  },
  petInfo: {
    flex: 1,
    minWidth: 0,
  },
  petName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 2px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  petBreed: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  petBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  badgeDog: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  badgeCat: {
    backgroundColor: '#E0E7FF',
    color: '#4338CA',
  },
  petDetails: {
    display: 'flex',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  detailLabel: {
    fontSize: '11px',
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#303344',
    fontWeight: 500,
  },
  // Pet card compact (for lists)
  petCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  petAvatarSm: {
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
    flexShrink: 0,
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: '20px',
    marginLeft: 'auto',
  },
  // Add pet card
  addPetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    border: '2px dashed #E5E7EB',
    width: '280px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    minHeight: '160px',
    transition: 'all 0.15s ease',
  },
  addPetCardHover: {
    borderColor: '#1E5081',
    backgroundColor: 'rgba(30, 80, 129, 0.02)',
  },
  addIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#1E5081',
    marginBottom: '12px',
  },
  addText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1E5081',
    margin: 0,
  },
  addSubtext: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
  },
  // Pet selector card (for consultation)
  petSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '2px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '320px',
  },
  petSelectorSelected: {
    borderColor: '#1E5081',
    backgroundColor: 'rgba(30, 80, 129, 0.02)',
  },
  radioCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  radioCircleSelected: {
    borderColor: '#1E5081',
    backgroundColor: '#1E5081',
  },
  radioDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
  },
};

export default function PetCard() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Pet Card Components
      </h1>

      {/* Standard Pet Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Standard Pet Cards</h2>
        <div style={styles.row}>
          {/* Dog card */}
          <div style={styles.petCard}>
            <div style={styles.petCardHeader}>
              <div style={styles.petAvatar}>M</div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>Max</h3>
                <p style={styles.petBreed}>Golden Retriever</p>
              </div>
              <span style={{ ...styles.petBadge, ...styles.badgeDog }}>Dog</span>
            </div>
            <div style={styles.petDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Age</span>
                <span style={styles.detailValue}>3 years</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Weight</span>
                <span style={styles.detailValue}>28 kg</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Gender</span>
                <span style={styles.detailValue}>Male</span>
              </div>
            </div>
          </div>

          {/* Cat card */}
          <div style={styles.petCard}>
            <div style={styles.petCardHeader}>
              <div style={styles.petAvatar}>B</div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>Bella</h3>
                <p style={styles.petBreed}>Persian Cat</p>
              </div>
              <span style={{ ...styles.petBadge, ...styles.badgeCat }}>Cat</span>
            </div>
            <div style={styles.petDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Age</span>
                <span style={styles.detailValue}>2 years</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Weight</span>
                <span style={styles.detailValue}>4.5 kg</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Gender</span>
                <span style={styles.detailValue}>Female</span>
              </div>
            </div>
          </div>

          {/* Hover state */}
          <div style={{ ...styles.petCard, ...styles.petCardHover }}>
            <div style={styles.petCardHeader}>
              <div style={styles.petAvatar}>R</div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>Rocky</h3>
                <p style={styles.petBreed}>German Shepherd</p>
              </div>
              <span style={{ ...styles.petBadge, ...styles.badgeDog }}>Dog</span>
            </div>
            <div style={styles.petDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Age</span>
                <span style={styles.detailValue}>5 years</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Weight</span>
                <span style={styles.detailValue}>35 kg</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Gender</span>
                <span style={styles.detailValue}>Male</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Pet Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Compact Pet Cards (List View)</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', maxWidth: '320px' }}>
          <div style={styles.petCardCompact}>
            <div style={styles.petAvatarSm}>M</div>
            <div style={styles.petInfo}>
              <h3 style={{ ...styles.petName, fontSize: '16px' }}>Max</h3>
              <p style={{ ...styles.petBreed, fontSize: '13px' }}>Golden Retriever, 3 yrs</p>
            </div>
            <span style={styles.chevron}>{'>'}</span>
          </div>
          <div style={styles.petCardCompact}>
            <div style={styles.petAvatarSm}>B</div>
            <div style={styles.petInfo}>
              <h3 style={{ ...styles.petName, fontSize: '16px' }}>Bella</h3>
              <p style={{ ...styles.petBreed, fontSize: '13px' }}>Persian Cat, 2 yrs</p>
            </div>
            <span style={styles.chevron}>{'>'}</span>
          </div>
          <div style={styles.petCardCompact}>
            <div style={styles.petAvatarSm}>R</div>
            <div style={styles.petInfo}>
              <h3 style={{ ...styles.petName, fontSize: '16px' }}>Rocky</h3>
              <p style={{ ...styles.petBreed, fontSize: '13px' }}>German Shepherd, 5 yrs</p>
            </div>
            <span style={styles.chevron}>{'>'}</span>
          </div>
        </div>
      </div>

      {/* Add Pet Card */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Add Pet Card</h2>
        <div style={styles.row}>
          <div style={styles.addPetCard}>
            <div style={styles.addIcon}>+</div>
            <h3 style={styles.addText}>Add New Pet</h3>
            <p style={styles.addSubtext}>Register your furry friend</p>
          </div>
          <div style={{ ...styles.addPetCard, ...styles.addPetCardHover }}>
            <div style={styles.addIcon}>+</div>
            <h3 style={styles.addText}>Add New Pet</h3>
            <p style={styles.addSubtext}>Register your furry friend</p>
          </div>
        </div>
      </div>

      {/* Pet Selector Cards (for consultation) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Pet Selector (Consultation Flow)</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', maxWidth: '320px' }}>
          <div style={{ ...styles.petSelectorCard, ...styles.petSelectorSelected }}>
            <div style={styles.petAvatarSm}>M</div>
            <div style={styles.petInfo}>
              <h3 style={{ ...styles.petName, fontSize: '16px' }}>Max</h3>
              <p style={{ ...styles.petBreed, fontSize: '13px' }}>Golden Retriever, 3 years</p>
            </div>
            <div style={{ ...styles.radioCircle, ...styles.radioCircleSelected }}>
              <div style={styles.radioDot}></div>
            </div>
          </div>
          <div style={styles.petSelectorCard}>
            <div style={styles.petAvatarSm}>B</div>
            <div style={styles.petInfo}>
              <h3 style={{ ...styles.petName, fontSize: '16px' }}>Bella</h3>
              <p style={{ ...styles.petBreed, fontSize: '13px' }}>Persian Cat, 2 years</p>
            </div>
            <div style={styles.radioCircle}></div>
          </div>
        </div>
      </div>

      {/* Pet Cards with Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Pet Cards with Recent Activity</h2>
        <div style={styles.row}>
          <div style={styles.petCard}>
            <div style={styles.petCardHeader}>
              <div style={styles.petAvatar}>M</div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>Max</h3>
                <p style={styles.petBreed}>Golden Retriever</p>
              </div>
            </div>
            <div style={{
              backgroundColor: '#D1FAE5',
              borderRadius: '6px',
              padding: '8px 12px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>&#10003;</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>Last Consultation</div>
                <div style={{ fontSize: '12px', color: '#047857' }}>2 days ago - Vaccination</div>
              </div>
            </div>
          </div>

          <div style={styles.petCard}>
            <div style={styles.petCardHeader}>
              <div style={styles.petAvatar}>B</div>
              <div style={styles.petInfo}>
                <h3 style={styles.petName}>Bella</h3>
                <p style={styles.petBreed}>Persian Cat</p>
              </div>
            </div>
            <div style={{
              backgroundColor: '#FEF3C7',
              borderRadius: '6px',
              padding: '8px 12px',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>&#128197;</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>Follow-up Due</div>
                <div style={{ fontSize: '12px', color: '#B45309' }}>Schedule within 3 days</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>No Pets Empty State</h2>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '40px 24px',
          textAlign: 'center' as const,
          maxWidth: '320px',
          border: '1px solid #E5E7EB',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#F2EAC3',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}>&#128054;</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
            No pets yet
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0' }}>
            Add your first pet to start booking consultations with our vets.
          </p>
          <button style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: '#1E5081',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}>Add Your First Pet</button>
        </div>
      </div>
    </div>
  );
}
