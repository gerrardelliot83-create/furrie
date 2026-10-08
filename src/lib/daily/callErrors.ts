/**
 * Plain-language messages for what Daily reports during a call (VC-1). Pure,
 * so the wording is unit-tested and the call screen only renders it.
 *
 * Before VC-1 the call screen ignored Daily's events: people saw a frozen
 * "Waiting…" screen or "Failed to join" with no reason, reloaded, and each
 * reload left another session in the room.
 *
 * Type names: @daily-co/daily-js DailyFatalErrorType / DailyCameraErrorType.
 */

export interface CallProblem {
  /** Short heading. */
  title: string;
  /** What happened and what to do, for a pet parent or a vet. */
  message: string;
  /** Daily's error type (or our own label), for reporting. */
  kind: string;
}

const FATAL_MESSAGES: Record<string, Omit<CallProblem, 'kind'>> = {
  'meeting-full': {
    title: 'The call is busy',
    message: 'An earlier connection is still being cleared. Tap Try again in a few seconds.',
  },
  ejected: {
    title: 'Call opened somewhere else',
    message: 'This call was opened in another tab or on another device, so it was closed here. Tap Try again to continue on this screen.',
  },
  'exp-room': {
    title: 'The call link has expired',
    message: 'Tap Try again to get a fresh link.',
  },
  'exp-token': {
    title: 'The call link has expired',
    message: 'Tap Try again to get a fresh link.',
  },
  'nbf-room': {
    title: 'The call has not opened yet',
    message: 'Tap Try again in a minute.',
  },
  'nbf-token': {
    title: 'The call has not opened yet',
    message: 'Tap Try again in a minute.',
  },
  'no-room': {
    title: 'We could not find the call',
    message: 'Tap Try again. If it keeps happening, write to support@furrie.in.',
  },
  'not-allowed': {
    title: 'You can’t join this call',
    message: 'Make sure you are signed in with the account that booked the consultation, then tap Try again.',
  },
  'connection-error': {
    title: 'We couldn’t connect',
    message: 'Check your internet connection (wifi or mobile data), then tap Try again.',
  },
  'end-of-life': {
    title: 'Please update your browser',
    message: 'This browser is too old for video calls. Update it, or open the link in the latest Chrome or Safari.',
  },
};

const FALLBACK: Omit<CallProblem, 'kind'> = {
  title: 'The call stopped',
  message: 'Something went wrong with the video call. Tap Try again.',
};

/** A fatal Daily error (the 'error' event, or a rejected join()). */
export function describeFatalError(type: string | null | undefined): CallProblem {
  const known = type ? FATAL_MESSAGES[type] : undefined;
  return { ...(known ?? FALLBACK), kind: type || 'unknown' };
}

const CAMERA_MESSAGES: Record<string, string> = {
  permissions:
    'Your camera or microphone is blocked. Allow them for app.furrie.in in your browser (tap the lock or settings icon next to the address), then tap Try again.',
  'cam-in-use': 'Another app is using your camera. Close it, then tap Try again.',
  'mic-in-use': 'Another app is using your microphone. Close it, then tap Try again.',
  'cam-mic-in-use': 'Another app is using your camera and microphone. Close it, then tap Try again.',
  'not-found': 'We couldn’t find a camera or microphone on this device.',
  'undefined-mediadevices':
    'This browser can’t use your camera. Open the link in Chrome (Android) or Safari (iPhone).',
  constraints: 'Your camera could not start. Tap Try again.',
};

/**
 * A camera/microphone problem (the 'camera-error' event). The call itself
 * may still be connected, so this is shown as a banner, not an error screen.
 */
export function describeCameraError(type: string | null | undefined): CallProblem {
  return {
    title: 'Camera or microphone problem',
    message: (type && CAMERA_MESSAGES[type]) || 'Your camera or microphone could not start. Tap Try again.',
    kind: `camera:${type || 'unknown'}`,
  };
}

/** The call ended without the person pressing End (dropped, closed by Daily). */
export const DISCONNECTED: CallProblem = {
  title: 'You were disconnected',
  message: 'The call dropped. Tap Rejoin to go back in.',
  kind: 'left-unexpectedly',
};
