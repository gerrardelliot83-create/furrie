// Daily.co video integration helpers for Furrie teleconsultations

export const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

// Room settings for consultations
// See: https://docs.daily.co/reference/rest-api/rooms/config
const DEFAULT_ROOM_CONFIG = {
  // Privacy: 'private' requires meeting token to join
  // Options: 'public', 'private'
  privacy: 'private' as const,

  // Recording: 'cloud' for server-side MP4 recording
  // Options: 'cloud', 'cloud-audio-only', 'local', 'raw-tracks', false
  enable_recording: 'cloud' as const,

  // Enable in-call text chat
  enable_chat: true,

  // Disable screenshare for teleconsultations
  enable_screenshare: false,

  // Max participants: 2 (customer + vet)
  max_participants: 2,

  // Room expiry (Unix timestamp) - set dynamically per room
  exp: 0,

  // Eject all participants when room expires
  eject_at_room_exp: true,

  // Disable Daily's built-in prejoin UI (we use custom)
  enable_prejoin_ui: false,

  // Start with video/audio enabled
  start_video_off: false,
  start_audio_off: false,

  // Enable lobby/knocking for private rooms (disabled for matched consultations)
  enable_knocking: false,

  // Auto-close empty room after 60 seconds
  autojoin: false,

  // Enable network quality monitoring
  enable_network_ui: true,

  // Enable active speaker detection
  enable_active_speaker_mode: true,

  // Owner-only broadcast (false - both can broadcast)
  owner_only_broadcast: false,

  // Experimental: noise cancellation
  enable_advanced_chat: false,
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

/**
 * Creates a Daily.co room for a consultation
 * @param consultationId - Used as unique room identifier
 * @param durationMinutes - Room expiry time in minutes (default 30)
 * @returns Room details including name and URL
 */
export async function createRoom(
  consultationId: string,
  durationMinutes: number = 30
): Promise<{ name: string; url: string; expiresAt: number }> {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  // Room name: furrie-{consultation_id}
  const roomName = `furrie-${consultationId}`;

  // Expiry: current time + duration + 5 min buffer
  const expiresAt = Math.floor(Date.now() / 1000) + (durationMinutes + 5) * 60;

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      properties: {
        ...DEFAULT_ROOM_CONFIG,
        exp: expiresAt,
      },
    }),
  });

  if (!response.ok) {
    const error: DailyError = await response.json();
    throw new Error(`Failed to create Daily room: ${error.error || error.info || 'Unknown error'}`);
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
