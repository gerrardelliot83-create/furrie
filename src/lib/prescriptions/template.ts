// Prescription PDF Template Configuration
export interface PrescriptionData {
  prescriptionNumber: string;
  date: string;
  // Vet details
  vetName: string;
  vciNumber: string;
  qualifications: string;
  specializations: string[];
  // Pet details
  petName: string;
  petSpecies: 'dog' | 'cat';
  petBreed: string;
  petAge: string;
  petWeight: string;
  // Owner details
  ownerName: string;
  ownerPhone: string;
  // Clinical details
  diagnosis: string;
  medications: PrescriptionMedication[];
  recommendations: string;
  warnings: string;
  // Consultation reference
  consultationId: string;
}

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const PRESCRIPTION_DISCLAIMER = `This prescription is valid for 30 days from the date of issue. Follow-up consultation is recommended if symptoms persist or worsen. For any emergency, please visit the nearest veterinary clinic immediately.

This prescription was generated via a teleconsultation. Certain physical examinations were not possible, and the diagnosis is based on the information provided by the pet parent and visual assessment during the video consultation.`;

export const FURRIE_FOOTER = 'Generated via Furrie Teleconsultation Platform | www.furrie.in';

// Format date as DD/MM/YYYY
export function formatPrescriptionDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Generate unique prescription number
export function generatePrescriptionNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RX-${timestamp}-${random}`;
}
