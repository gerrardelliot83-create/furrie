/**
 * Vet names are stored WITHOUT a "Dr." prefix (C-09). About 40 places in the
 * app and every email add "Dr." when they show a vet's name, so a stored
 * "Dr. Priya Sharma" came out as "Dr. Dr. Priya Sharma". Strip it on save.
 * Leaves names that merely start with "Dr" (e.g. "Drishti") alone.
 */
export function stripDoctorPrefix(name: string): string {
  return name.replace(/^\s*(?:dr\.\s*|dr\s+|doctor\s+)/i, '').trim();
}
