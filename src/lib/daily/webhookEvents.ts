/**
 * Daily webhook bodies, as documented (P0R-1). Every event has a top-level
 * `type` (not `event`) and a `payload`:
 *
 *   meeting.ended               payload.room, start_ts, end_ts, meeting_id
 *     https://docs.daily.co/reference/rest-api/webhooks/events/meeting-ended
 *   recording.ready-to-download payload.room_name, recording_id, duration, status
 *     https://docs.daily.co/reference/rest-api/webhooks/events/recording-ready-to-download
 *   participant.joined          payload.room, user_id, user_name, joined_at, owner
 *     https://docs.daily.co/reference/rest-api/webhooks/events/participant-joined
 *
 * Note the recording event really does say `room_name` while the others say
 * `room`. Timestamps are Unix seconds (may carry fractions).
 */

export type DailyWebhookEvent =
  | {
      type: 'meeting.ended';
      room: string | null;
      startTs: number | null;
      endTs: number | null;
      meetingId: string | null;
    }
  | {
      type: 'recording.ready-to-download';
      roomName: string | null;
      recordingId: string | null;
      durationSeconds: number | null;
      status: string | null;
    }
  | {
      type: 'participant.joined';
      room: string | null;
      userId: string | null;
      isOwner: boolean;
      joinedAt: number | null;
    }
  | { type: 'participant.left'; room: string | null; userId: string | null }
  | { type: 'unknown'; rawType: string | null };

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseDailyWebhook(body: unknown): DailyWebhookEvent {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const payload = (root.payload && typeof root.payload === 'object' ? root.payload : {}) as Record<
    string,
    unknown
  >;
  const type = str(root.type);

  switch (type) {
    case 'meeting.ended':
      return {
        type,
        room: str(payload.room),
        startTs: num(payload.start_ts),
        endTs: num(payload.end_ts),
        meetingId: str(payload.meeting_id),
      };
    case 'recording.ready-to-download':
      return {
        type,
        roomName: str(payload.room_name),
        recordingId: str(payload.recording_id),
        durationSeconds: num(payload.duration),
        status: str(payload.status),
      };
    case 'participant.joined':
      return {
        type,
        room: str(payload.room),
        userId: str(payload.user_id),
        isOwner: payload.owner === true,
        joinedAt: num(payload.joined_at),
      };
    case 'participant.left':
      return { type, room: str(payload.room), userId: str(payload.user_id) };
    default:
      return { type: 'unknown', rawType: type };
  }
}

/** Whole minutes of a meeting (at least 1), or null if the timestamps are unusable. */
export function meetingDurationMinutes(startTs: number | null, endTs: number | null): number | null {
  if (startTs === null || endTs === null || endTs < startTs) return null;
  return Math.max(1, Math.round((endTs - startTs) / 60));
}
