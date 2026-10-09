/**
 * In-page events shared by the vet portal (C-05). Realtime reaches the portal
 * through one Broadcast subscription in VetAlerts; everything else listens
 * for these window events instead of opening its own copy of the channel.
 * (The `postgres_changes` subscriptions never fire: the Realtime publication
 * has no tables — audit Phase 6.)
 */

/** A booking arrived, a customer joined, or a consultation changed: re-fetch. */
export const VET_CONSULTATIONS_CHANGED_EVENT = 'furrie:vet-consultations-changed';

/** The vet switched Available on or off. detail: { isAvailable: boolean } */
export const VET_AVAILABILITY_CHANGED_EVENT = 'furrie:vet-availability-changed';

/**
 * The consultation a vet-portal address is about (its detail page, video room,
 * notes…), and whether it is the video room. The vet host serves
 * /consultations/<id>; /vet-portal/… is the same page by its internal path.
 */
export function consultationPage(pathname: string): { consultationId: string; inRoom: boolean } | null {
  const match = /^(?:\/vet-portal)?\/consultations\/([^/?#]+)(?:\/([^/?#]+))?\/?$/.exec(pathname);
  if (!match) return null;
  return { consultationId: match[1], inRoom: match[2] === 'room' };
}

export function emitVetConsultationsChanged(): void {
  window.dispatchEvent(new CustomEvent(VET_CONSULTATIONS_CHANGED_EVENT));
}

export function emitVetAvailabilityChanged(isAvailable: boolean): void {
  window.dispatchEvent(new CustomEvent(VET_AVAILABILITY_CHANGED_EVENT, { detail: { isAvailable } }));
}
