/**
 * Daily room names are derived from the consultation id — `furrie-<uuid>` —
 * never taken from user input. Pure helpers, safe to import anywhere.
 */

const ROOM_NAME = /^furrie-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function roomNameForConsultation(consultationId: string): string {
  return `furrie-${consultationId}`;
}

/** The consultation id inside a Furrie room name, or null for any other room. */
export function consultationIdFromRoom(roomName: string | null | undefined): string | null {
  if (!roomName) return null;
  const match = ROOM_NAME.exec(roomName);
  return match ? match[1].toLowerCase() : null;
}
