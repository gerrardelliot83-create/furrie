import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { PrescriptionData } from '@/lib/prescriptions/template';
import { PRESCRIPTION_DISCLAIMER, FURRIE_FOOTER } from '@/lib/prescriptions/template';

// Register fonts (using default fonts for now)
// Font.register({ family: 'Helvetica', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#770002',
  },
  logo: {
    width: 120,
    height: 57,
  },
  logoFallback: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#770002',
  },
  prescriptionInfo: {
    textAlign: 'right',
  },
  prescriptionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: '#666',
  },
  section: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#770002',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#000',
  },
  diagnosisSection: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  diagnosisTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#770002',
    marginBottom: 6,
  },
  diagnosisText: {
    fontSize: 11,
    color: '#000',
  },
  medicationsSection: {
    marginBottom: 15,
  },
  medicationHeader: {
    flexDirection: 'row',
    backgroundColor: '#770002',
    padding: 8,
    marginBottom: 1,
  },
  medicationHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  medicationRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 1,
  },
  medicationRowAlt: {
    backgroundColor: '#fff',
  },
  medicationCol1: { width: '25%' },
  medicationCol2: { width: '15%' },
  medicationCol3: { width: '20%' },
  medicationCol4: { width: '15%' },
  medicationCol5: { width: '25%' },
  medicationName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  medicationDetail: {
    fontSize: 9,
    color: '#333',
  },
  recommendationsSection: {
    marginBottom: 15,
  },
  recommendationsText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  warningsSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  warningsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 6,
  },
  warningsText: {
    fontSize: 9,
    color: '#856404',
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#e8e8e8',
    borderRadius: 4,
  },
  disclaimerTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#666',
  },
  disclaimerText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  consultationId: {
    fontSize: 8,
    color: '#999',
    marginTop: 4,
  },
});

interface PrescriptionPDFProps {
  data: PrescriptionData;
}

export function PrescriptionPDF({ data }: PrescriptionPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            style={styles.logo}
            src="/assets/furrie-logo.png"
          />
          <View style={styles.prescriptionInfo}>
            <Text style={styles.prescriptionNumber}>
              Prescription #{data.prescriptionNumber}
            </Text>
            <Text style={styles.date}>Date: {data.date}</Text>
          </View>
        </View>

        {/* Veterinarian Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veterinarian Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>Dr. {data.vetName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VCI Registration:</Text>
            <Text style={styles.value}>{data.vciNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Qualifications:</Text>
            <Text style={styles.value}>{data.qualifications}</Text>
          </View>
          {data.specializations.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Specializations:</Text>
              <Text style={styles.value}>{data.specializations.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Pet Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pet Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.petName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Species:</Text>
            <Text style={styles.value}>
              {data.petSpecies === 'dog' ? 'Dog' : 'Cat'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Breed:</Text>
            <Text style={styles.value}>{data.petBreed}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{data.petAge}</Text>
          </View>
          {data.petWeight && (
            <View style={styles.row}>
              <Text style={styles.label}>Weight:</Text>
              <Text style={styles.value}>{data.petWeight} kg</Text>
            </View>
          )}
        </View>

        {/* Owner Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{data.ownerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.ownerPhone}</Text>
          </View>
        </View>

        {/* Diagnosis */}
        <View style={styles.diagnosisSection}>
          <Text style={styles.diagnosisTitle}>Diagnosis</Text>
          <Text style={styles.diagnosisText}>{data.diagnosis}</Text>
        </View>

        {/* Medications Table */}
        {data.medications.length > 0 && (
          <View style={styles.medicationsSection}>
            <Text style={styles.sectionTitle}>Prescription (Rx)</Text>
            <View style={styles.medicationHeader}>
              <Text style={[styles.medicationHeaderText, styles.medicationCol1]}>
                Medication
              </Text>
              <Text style={[styles.medicationHeaderText, styles.medicationCol2]}>
                Dosage
              </Text>
              <Text style={[styles.medicationHeaderText, styles.medicationCol3]}>
                Frequency
              </Text>
              <Text style={[styles.medicationHeaderText, styles.medicationCol4]}>
                Duration
              </Text>
              <Text style={[styles.medicationHeaderText, styles.medicationCol5]}>
                Instructions
              </Text>
            </View>
            {data.medications.map((med, index) => (
              <View
                key={index}
                style={[
                  styles.medicationRow,
                  index % 2 === 1 ? styles.medicationRowAlt : {},
                ]}
              >
                <Text style={[styles.medicationName, styles.medicationCol1]}>
                  {med.name}
                </Text>
                <Text style={[styles.medicationDetail, styles.medicationCol2]}>
                  {med.dosage}
                </Text>
                <Text style={[styles.medicationDetail, styles.medicationCol3]}>
                  {med.frequency}
                </Text>
                <Text style={[styles.medicationDetail, styles.medicationCol4]}>
                  {med.duration}
                </Text>
                <Text style={[styles.medicationDetail, styles.medicationCol5]}>
                  {med.instructions || '-'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {data.recommendations && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Text style={styles.recommendationsText}>{data.recommendations}</Text>
          </View>
        )}

        {/* Warnings */}
        {data.warnings && (
          <View style={styles.warningsSection}>
            <Text style={styles.warningsTitle}>Warning Signs to Watch</Text>
            <Text style={styles.warningsText}>{data.warnings}</Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>DISCLAIMER</Text>
          <Text style={styles.disclaimerText}>{PRESCRIPTION_DISCLAIMER}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{FURRIE_FOOTER}</Text>
          <Text style={styles.consultationId}>
            Consultation ID: {data.consultationId}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
