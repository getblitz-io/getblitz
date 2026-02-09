import { UAParser } from "ua-parser-js";

import type { DeviceDetails } from "../interfaces";

export function parseDeviceDetails(headers: Headers): DeviceDetails {
  const userAgent = headers.get("user-agent") ?? "";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const deviceType = result.device.type ?? "desktop";
  const deviceOs = result.os.name
    ? `${result.os.name} ${result.os.version}`.trim()
    : "Unknown";
  const deviceBrowser = result.browser.name
    ? `${result.browser.name} ${result.browser.version}`.trim()
    : "Unknown";

  const ipAddress = getIpAddress(headers);

  return {
    ipAddress,
    userAgent,
    deviceType,
    deviceOs,
    deviceBrowser,
  };
}

export function getIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() ?? "unknown";
}
