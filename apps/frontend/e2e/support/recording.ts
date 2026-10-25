// Demo recording, shared by playwright.config.ts and the demo helpers. Kept
// free of Playwright imports so the config can load it.
//
// DEMO_RECORD=1 records every browser window of the demo to video. A video
// needs a fixed size, so a recorded demo renders at RECORDING_SIZE instead of
// following the window.

export const isRecording = process.env.DEMO_RECORD === "1"

export const RECORDING_SIZE = { width: 1920, height: 1080 }

/**
 * Where extra windows (another person's browser) save their video. The main
 * page's video lands in that test's folder under test-results.
 */
export const EXTRA_VIDEO_DIR = new URL("../../test-results/videos/", import.meta.url).pathname
