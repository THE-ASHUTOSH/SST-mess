/**
 * Camera helpers for the QR scanners.
 *
 * The browser's permission prompt can be shown once and, if the user picks Block, never again —
 * nothing in JavaScript can bring it back. So the scanners ask in their own words first (see
 * `components/common/CameraPermissionPrompt`) and only call `requestCameraAccess` once the operator
 * has said yes, which is the call that raises the real prompt.
 */

/**
 * Whether this site already holds camera permission, so the soft prompt can be skipped for an
 * operator who has granted it before. Browsers without the `camera` descriptor (Safari, Firefox)
 * can't answer — they get the prompt, which is the safe direction to be wrong in.
 */
export async function cameraAlreadyGranted(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return false;
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}

/**
 * Raise the browser's own permission prompt. Call it from inside the click that accepted the soft
 * prompt — iOS Safari only honours the request when a gesture triggered it. The stream is released
 * straight away; the scanner opens its own.
 */
export async function requestCameraAccess(): Promise<void> {
  if (typeof navigator === "undefined" || typeof navigator.mediaDevices?.getUserMedia !== "function") {
    throw new DOMException("getUserMedia is not available", "NotSupportedError");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * A short, actionable sentence for a camera failure. `html5-qrcode` rejects with a string it built
 * itself (`"Error getting userMedia, error = NotAllowedError: …"`) rather than the DOMException, so
 * match on the flattened text of either.
 */
export function cameraFailureMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera needs a secure (https) connection.";
  }

  const text =
    typeof err === "string"
      ? err
      : err && typeof err === "object"
        ? [(err as { name?: unknown }).name, (err as { message?: unknown }).message]
            .filter((part): part is string => typeof part === "string")
            .join(" ")
        : "";

  if (/NotAllowedError|Permission denied|permission dismissed/i.test(text)) {
    return "Camera access was blocked. Allow the camera for this site in your browser settings, then try again.";
  }
  if (/NotFoundError|DevicesNotFound|OverconstrainedError/i.test(text)) {
    return "No camera was found on this device.";
  }
  if (/NotReadableError|TrackStartError|AbortError/i.test(text)) {
    return "The camera is already in use by another app or tab. Close it and try again.";
  }
  return "The camera couldn't be started. Check that nothing else is using it, then try again.";
}
