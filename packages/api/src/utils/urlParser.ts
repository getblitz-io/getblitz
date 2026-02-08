import { UAParser } from "ua-parser-js";

import type { DeviceDetails } from "../interfaces";

export function parseDeviceDetails(headers: Headers): DeviceDetails {
  const userAgent = headers.get("user-agent") ?? "";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const ipAddress = getIpAddress(headers);

  return {
    ipAddress,
    userAgent,
    deviceType: result.device.type ?? "desktop", // Default to desktop if type is undefined (common for desktop browsers)
    deviceOs: `${result.os.name} ${result.os.version}`.trim(),
    deviceBrowser: `${result.browser.name} ${result.browser.version}`.trim(),
  };
}

export function getIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() ?? "unknown";
}
