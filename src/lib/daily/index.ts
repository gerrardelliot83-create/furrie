// Daily.co video integration helpers for Furrie teleconsultations

import * as Sentry from '@sentry/nextjs';
import { roomNameForConsultation } from './rooms';
import { ROOM_MAX_PARTICIPANTS, roomNeedsUpdate } from './roomLife';
import { parsePresence, sessionsToEject, type PresenceSession } from './roomCleanup';
import { parseMeetings, type MeetingRecord } from './meetings';

export { roomNameForConsultation, consultationIdFromRoom } from './rooms';
export { roomExpiryFor } from './roomLife';
export { secondsTogether, type MeetingRecord } from './meetings';

export const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

// Room properties for consultations (inside "properties" object)
// See: https://docs.daily.co/reference/rest-api/rooms/config
// NOTE: 'privacy' is a top-level param, not inside properties
const DEFAULT_ROOM_PROPERTIES = {
  // Recording: 'cloud' for server-side MP4 recording (pay-as-you-go enabled)
  enable_recording: 'cloud' as const,

  // Enable in-call text chat
  enable_chat: true,

  // Disable screenshare for teleconsultations
  enable_screenshare: false,

  // The pet parent and the vet, plus spare places for a reload or a dropped
  // connection that Daily hasn't cleared yet (VC-1, ./roomLife).
  max_participants: ROOM_MAX_PARTICIPANTS,

  // Room expiry (Unix timestamp) - set per room from the booking time
  // (./roomLife roomExpiryFor)
  exp: 0,

  // Eject all participants when room expires
  eject_at_room_exp: true,

  // Disable lobby/knocking for matched consultations
  enable_knocking: false,

  // Start with video/audio enabled
  start_video_off: false,
  start_audio_off: false,
};

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: string;
  config: {
    exp: number;
    max_participants: number;
    enable_recording: string;
  };
}

export interface DailyMeetingToken {
  token: string;
}

interface DailyError {
  error?: string;
  info?: string;
}

export interface PreparedRoom {
  name: string;
  url: string;
  /** Unix seconds the room is open until. */
  expiresAt: number;
  /** How many people the room admits right now. */
  maxParticipants: number;
  /** 'created' now, 'updated' (expiry pushed out / cap raised) or 'ready' as it was. */
  action: 'created' | 'updated' | 'ready';
}

/**
 * The consultation's room, ready for someone to join right now (VC-1): it
 * exists, stays open until at least `expiresAt` and has the current
 * participant cap. Rooms made before VC-1 (35-minute life, 2 places), and
 * rooms that already closed, are updated rather than handed out as they are.
 */
export async function prepareConsultationRoom(
  consultationId: string,
  expiresAt: number
): Promise<PreparedRoom> {
  const roomName = roomNameForConsultation(consultationId);

  let existing = await getRoom(roomName);
  if (!existing) {
    const created = await createRoom(consultationId, expiresAt);
    if (created) return { ...created, maxParticipants: ROOM_MAX_PARTICIPANTS, action: 'created' };
    // Someone else created it between our GET and POST (both people joining at once).
    existing = await getRoom(roomName);
    if (!existing) throw new Error(`Daily room ${roomName} could not be created or found`);
  }

  if (!roomNeedsUpdate(existing.config, expiresAt)) {
    return {
      name: existing.name,
      url: existing.url,
      expiresAt: existing.config.exp,
      maxParticipants: existing.config.max_participants,
      action: 'ready',
    };
  }

  const currentExp = existing.config?.exp ?? 0;
  const newExp = Math.max(currentExp, expiresAt);
  try {
    await updateRoomProperties(roomName, {
      exp: newExp,
      eject_at_room_exp: true,
      max_participants: ROOM_MAX_PARTICIPANTS,
    });
  } catch (error) {
    // A blip or a refused change must not lock people out of a room that is
    // still open: hand out the room as it is when it has time left.
    if (currentExp * 1000 > Date.now() + 10 * 60 * 1000) {
      console.error(`[daily] room ${roomName} update failed; using it as it is:`, error);
      Sentry.captureException(error, { tags: { area: 'video-call', 'call.kind': 'room-update-failed' } });
      return {
        name: existing.name,
        url: existing.url,
        expiresAt: currentExp,
        maxParticipants: existing.config?.max_participants || 2,
        action: 'ready',
      };
    }
    throw error;
  }
  return { name: existing.name, url: existing.url, expiresAt: newExp, maxParticipants: ROOM_MAX_PARTICIPANTS, action: 'updated' };
}

/** POST /rooms/:name — change a room's properties. */
async function updateRoomProperties(roomName: string, properties: Record<string, unknown>): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }
  const response = await fetch(`${DAILY_API_URL}/rooms/${encodeURIComponent(roomName)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({ properties }),
  });
  if (!response.ok) {
    const error: DailyError = await response.json().catch(() => ({}));
    throw new Error(`Failed to update Daily room: ${error.error || error.info || `HTTP ${response.status}`}`);
  }
}

/**
 * Who is in the room right now, or null if Daily can't be asked.
 * https://docs.daily.co/reference/rest-api/rooms/get-room-presence
 */
export async function getRoomPresence(roomName: string): Promise<PresenceSession[] | null> {
  if (!DAILY_API_KEY) return null;
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${encodeURIComponent(roomName)}/presence`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      console.error(`[daily] presence for room ${roomName} failed: HTTP ${response.status}`);
      return null;
    }
    return parsePresence(await response.json().catch(() => null));
  } catch (error) {
    console.error(`[daily] presence for room ${roomName} failed:`, error);
    return null;
  }
}

/**
 * Ejects sessions (by Daily session id) or everyone signed in as a user (by
 * our user id). Best effort: logs and returns 0 on failure.
 * https://docs.daily.co/reference/rest-api/rooms/eject
 */
async function ejectFromRoom(
  roomName: string,
  target: { ids?: string[]; userIds?: string[] }
): Promise<number> {
  if (!DAILY_API_KEY) return 0;
  const body: Record<string, string[]> = {};
  if (target.ids?.length) body.ids = target.ids;
  if (target.userIds?.length) body.user_ids = target.userIds;
  if (!body.ids && !body.user_ids) return 0;
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${encodeURIComponent(roomName)}/eject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      console.error(`[daily] eject for room ${roomName} failed: HTTP ${response.status}`);
      return 0;
    }
    const data = (await response.json().catch(() => null)) as { ejectedIds?: unknown } | null;
    return Array.isArray(data?.ejectedIds) ? data.ejectedIds.length : 0;
  } catch (error) {
    console.error(`[daily] eject for room ${roomName} failed:`, error);
    return 0;
  }
}

export interface RoomCleanup {
  /** Sessions removed. */
  ejected: number;
  /** How many of the removed sessions were the caller's own earlier ones. */
  ownSessions: number;
  /** How many were someone else's (an older duplicate, or not one of ours). */
  otherSessions: number;
  /** 'presence' = checked who was in the room; 'fallback' = Daily presence failed, caller's sessions only. */
  method: 'presence' | 'fallback';
}

/**
 * Clears the room before `callerUserId` joins (VC-1, L1 + L4; rules in
 * ./roomCleanup): the caller's earlier sessions and anyone else; the other
 * participant's older sessions only if the room would still be full.
 * `maxParticipants` is the room's actual cap. Never throws: the join goes ahead.
 */
export async function clearRoomForJoin(
  roomName: string,
  opts: { callerUserId: string; otherUserId: string | null; maxParticipants: number }
): Promise<RoomCleanup> {
  const presence = await getRoomPresence(roomName);
  if (presence === null) {
    const ejected = await ejectFromRoom(roomName, { userIds: [opts.callerUserId] });
    return { ejected, ownSessions: ejected, otherSessions: 0, method: 'fallback' };
  }

  const ids = sessionsToEject(presence, opts);
  if (ids.length === 0) return { ejected: 0, ownSessions: 0, otherSessions: 0, method: 'presence' };

  const own = new Set(presence.filter((s) => s.userId === opts.callerUserId).map((s) => s.id));
  const ownSessions = ids.filter((id) => own.has(id)).length;
  const ejected = await ejectFromRoom(roomName, { ids });
  return { ejected, ownSessions, otherSessions: ids.length - ownSessions, method: 'presence' };
}

/**
 * Removes one session when its page closes (VC-1, L3), but only if Daily
 * says it belongs to `userId`, so a caller can't remove someone else.
 */
export async function ejectOwnSession(roomName: string, sessionId: string, userId: string): Promise<boolean> {
  const presence = await getRoomPresence(roomName);
  if (!presence?.some((s) => s.id === sessionId && s.userId === userId)) return false;
  return (await ejectFromRoom(roomName, { ids: [sessionId] })) > 0;
}

/**
 * Creates a Daily.co room for a consultation, open until `expiresAt` (Unix
 * seconds). Returns null if the room already exists (409): use
 * prepareConsultationRoom, which handles that.
 */
async function createRoom(
  consultationId: string,
  expiresAt: number
): Promise<{ name: string; url: string; expiresAt: number } | null> {
  if (!DAILY_API_KEY) {
    console.error('DAILY_API_KEY is not configured. Check Vercel environment variables.');
    throw new Error('DAILY_API_KEY is not configured');
  }

  // Room name: furrie-{consultation_id}
  const roomName = roomNameForConsultation(consultationId);

  // Build request body
  // Note: 'privacy' is a top-level property, not inside 'properties'
  const requestBody = {
    name: roomName,
    privacy: 'private' as const,
    properties: {
      ...DEFAULT_ROOM_PROPERTIES,
      exp: expiresAt,
    },
  };

  // Log the exact request being sent for debugging
  console.log('Daily.co createRoom request:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  // Room already exists (409 Conflict): the caller fetches and updates it.
  if (response.status === 409) {
    console.log(`Room ${roomName} already exists`);
    return null;
  }

  if (!response.ok) {
    // Get full error response for debugging
    const responseText = await response.text();
    let errorData: Record<string, unknown> = {};
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { rawResponse: responseText };
    }

    // Daily may answer a duplicate name with 400 "... already exists".
    if (/already exists/i.test(String(errorData.info ?? errorData.error ?? ''))) {
      console.log(`Room ${roomName} already exists`);
      return null;
    }

    console.error('Daily.co API error - FULL RESPONSE:', {
      status: response.status,
      statusText: response.statusText,
      roomName,
      fullError: JSON.stringify(errorData, null, 2),
    });

    const error = errorData as DailyError;
    const errorMessage = error.error || error.info || `HTTP ${response.status}`;
    throw new Error(`Failed to create Daily room: ${errorMessage}`);
  }

  const room: DailyRoom = await response.json();

  return {
    name: room.name,
    url: room.url,
    expiresAt,
  };
}

/**
 * Meeting token options for customizing participant experience
 * See: https://docs.daily.co/reference/rest-api/meeting-tokens/config
 */
export interface TokenOptions {
  /** Whether participant can control recording (vets only) */
  canRecord?: boolean;
  /** Auto-start cloud recording when participant joins */
  autoStartRecording?: boolean;
  /** Custom avatar URL for participant */
  avatarUrl?: string;
  /** Eject participant after N seconds in meeting */
  ejectAfterElapsed?: number;
  /** Start with camera off */
  startVideoOff?: boolean;
  /** Start with microphone off */
  startAudioOff?: boolean;
}

/**
 * Generates a meeting token for a participant
 * @param roomName - The Daily.co room name
 * @param userId - User identifier for the participant
 * @param userName - Display name for the participant
 * @param isOwner - Whether the participant has owner privileges (vets have owner rights)
 * @param expiresInMinutes - Token expiry in minutes (default 60)
 * @param options - Additional token configuration options
 * @returns JWT meeting token
 */
export async function generateToken(
  roomName: string,
  userId: string,
  userName: string,
  isOwner: boolean = false,
  expiresInMinutes: number = 60,
  options: TokenOptions = {}
): Promise<string> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;

  // Build token properties
  // See: https://docs.daily.co/reference/rest-api/meeting-tokens/config
  const tokenProperties: Record<string, unknown> = {
    // Required: Always set room_name for security
    room_name: roomName,

    // User identification
    user_id: userId,
    user_name: userName,

    // Owner privileges (vets can manage recording, kick participants)
    is_owner: isOwner,

    // Token expiry (required for security)
    exp: expiresAt,

    // Recording permissions
    enable_recording: options.canRecord ?? isOwner ? 'cloud' : false,
    start_cloud_recording: options.autoStartRecording ?? false,

    // Video/Audio settings
    start_video_off: options.startVideoOff ?? false,
    start_audio_off: options.startAudioOff ?? false,

    // Disable screenshare for teleconsultations
    enable_screenshare: false,
  };

  // Optional: Eject after elapsed time
  if (options.ejectAfterElapsed) {
    tokenProperties.eject_after_elapsed = options.ejectAfterElapsed;
  }

  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: tokenProperties,
    }),
  });

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to generate meeting token: ${error.error || error.info || 'Unknown error'}`);
  }

  const data: DailyMeetingToken = await response.json();
  return data.token;
}

/**
 * Deletes a Daily.co room
 * @param roomName - The room name to delete
 */
export async function deleteRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  // 404 is ok - room might already be deleted
  if (!response.ok && response.status !== 404) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to delete Daily room: ${error.error || error.info || 'Unknown error'}`);
  }
}

/**
 * Gets room info from Daily.co
 * @param roomName - The room name to fetch
 * @returns Room details or null if not found
 */
export async function getRoom(roomName: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to get Daily room: ${error.error || error.info || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Extends a room's expiry time
 * @param roomName - The room name to extend
 * @param additionalMinutes - Minutes to add to current expiry
 */
export async function extendRoomExpiry(
  roomName: string,
  additionalMinutes: number = 15
): Promise<{ expiresAt: number }> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  // Get current room
  const room = await getRoom(roomName);
  if (!room) {
    throw new Error(`Room ${roomName} not found`);
  }

  // Calculate new expiry
  const currentExp = room.config.exp;
  const newExp = currentExp + additionalMinutes * 60;

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        exp: newExp,
      },
    }),
  });

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to extend room expiry: ${error.error || error.info || 'Unknown error'}`);
  }

  return { expiresAt: newExp };
}

/**
 * Starts cloud recording for a room
 * This should only be called by the vet (room owner)
 */
export async function startRecording(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      type: 'cloud',
    }),
  });

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to start recording: ${error.error || error.info || 'Unknown error'}`);
  }
}

/**
 * Stops cloud recording for a room
 */
export async function stopRecording(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}/recordings`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to stop recording: ${error.error || error.info || 'Unknown error'}`);
  }
}

/**
 * Gets meetings for a specific room from Daily.co API
 * Used by the stale-active-consultations cron to determine actual call status/duration
 * @param roomName - The Daily.co room name (e.g., furrie-{consultationId})
 * @returns Meeting data or null if no meetings found / API error
 */
export async function getMeetingsByRoom(roomName: string): Promise<{
  duration: number;
  ended: boolean;
  ongoing: boolean;
} | null> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(
    `${DAILY_API_URL}/meetings?room=${encodeURIComponent(roomName)}&limit=1`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error(`Failed to get meetings for room ${roomName}: HTTP ${response.status}`);
    return null;
  }

  const data = await response.json();
  const meetings = data.data;

  if (!meetings || meetings.length === 0) {
    return null;
  }

  const meeting = meetings[0];
  const ongoing = meeting.ongoing ?? false;
  const ended = !ongoing;
  // Duration is in seconds from Daily.co API
  const duration = meeting.duration ?? 0;

  return { duration, ended, ongoing };
}

export interface RoomAttendance {
  /** Meetings (sessions) Daily has recorded for the room. */
  meetings: number;
  /** True while anyone is still in the room. */
  ongoing: boolean;
  /** Sum of all meetings' durations, in seconds. */
  totalSeconds: number;
  /** Our user ids (from the meeting tokens) of everyone who was in the room. */
  participantUserIds: string[];
  /** Each meeting with who was in it and when (VC-1b: were the two in the call together?). */
  records: MeetingRecord[];
}

/**
 * Who was in a consultation's room, and when, across every meeting (a
 * dropped call and a rejoin are separate meetings). Returns null when Daily
 * can't be asked, so callers never mistake "unknown" for "nobody came".
 * https://docs.daily.co/reference/rest-api/meetings (participants[].user_id,
 * join_time, duration; parsed by ./meetings)
 */
export async function getRoomAttendance(roomName: string): Promise<RoomAttendance | null> {
  if (!DAILY_API_KEY) {
    console.error('DAILY_API_KEY is not configured');
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${DAILY_API_URL}/meetings?room=${encodeURIComponent(roomName)}&limit=10`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
      // The vet's Finish waits on this; a slow Daily must not hold it up.
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error(`Daily meetings request failed for room ${roomName}:`, error);
    return null;
  }

  if (!response.ok) {
    console.error(`Failed to get meetings for room ${roomName}: HTTP ${response.status}`);
    return null;
  }

  const data: unknown = await response.json().catch(() => null);
  if (!data) return null;

  const records = parseMeetings(data, Math.floor(Date.now() / 1000));
  const userIds = new Set<string>();
  let totalSeconds = 0;
  let ongoing = false;

  for (const meeting of records) {
    if (meeting.ongoing) ongoing = true;
    totalSeconds += meeting.durationSec;
    for (const session of meeting.sessions) {
      if (session.userId) userIds.add(session.userId);
    }
  }

  return { meetings: records.length, ongoing, totalSeconds, participantUserIds: [...userIds], records };
}

/**
 * Gets the recording access link for a room
 * @param recordingId - The recording ID from webhook
 */
export async function getRecordingLink(recordingId: string): Promise<string | null> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_API_URL}/recordings/${recordingId}/access-link`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to get recording link: ${error.error || error.info || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.download_link || null;
}
