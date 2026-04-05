import { ApiReference } from "@scalar/nextjs-api-reference";

const config = {
  url: "/api/swagger",
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
