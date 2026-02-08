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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    deviceType: result.device?.type ?? "desktop", // Default to desktop if type is undefined (common for desktop browsers)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    deviceOs:
      `${result.os?.name ?? "Unknown"} ${result.os?.version ?? ""}`.trim(),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    deviceBrowser:
      `${result.browser?.name ?? "Unknown"} ${result.browser?.version ?? ""}`.trim(),
  };
}

export function getIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return "unknown";
  }
  return forwardedFor.split(",")[0]?.trim() ?? "unknown";
}
