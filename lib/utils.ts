import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Open a native `<input type="month|date|time|…">` picker programmatically.
 *
 * By default browsers only open the picker when the small calendar icon is clicked — clicking the
 * rest of the field just places the caret, which reads as broken. Call this from `onClick` so the
 * whole control opens it. Pair it with `cursor-pointer` so the field looks clickable.
 *
 * Safe to call unconditionally: it no-ops when the browser lacks `showPicker`, when the field is
 * disabled/readonly, and when the call is rejected (it throws if the picker is already opening —
 * which happens when the click landed on the icon and the native behaviour already fired).
 */
export function openNativePicker(input: HTMLInputElement | null | undefined) {
  if (!input || input.disabled || input.readOnly) return
  if (typeof input.showPicker !== "function") return
  try {
    input.showPicker()
  } catch {
    // Degrade silently — the calendar icon still works, so a console error would be noise.
  }
}
