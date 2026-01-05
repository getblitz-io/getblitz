import { NextResponse } from "next/server";

import packageJson from "../../../../package.json";

/**
 * GET /api/version
 * Returns the current application version from package.json
 * Used by the version checker component to detect new releases
 */
export function GET() {
  return NextResponse.json({
    version: packageJson.version,
    name: packageJson.name,
  });
}
