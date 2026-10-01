export function isScreenshotMode() {
  return process.env.SCREENSHOT_MODE === "1" && process.env.NODE_ENV !== "production";
}
