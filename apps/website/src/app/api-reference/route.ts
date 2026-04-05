import { ApiReference } from "@scalar/nextjs-api-reference";

import { env } from "~/env";

const config = {
  url: env.NEXT_PUBLIC_APP_URL
    ? `${env.NEXT_PUBLIC_APP_URL}/api/swagger`
    : "http://localhost:3000/api/swagger",
  servers: [
    {
      url: "https://local.getblitz.io/api/v1",
      name: "Local Proxy",
    },
    {
      url: "http://localhost:3000/api/v1",
      name: "Local",
    },
    {
      url: "https://app.getblitz.io/api/v1",
      name: "Production",
    },
  ],
};

export const GET = ApiReference(config);
