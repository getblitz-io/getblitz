import { createSwaggerSpec } from "next-swagger-doc";

export function GET() {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api/v1",
    definition: {
      openapi: "3.0.0",
      info: { title: "Blitz API", version: "1.0" },
      components: {
        securitySchemes: {
          BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
    },
  });

  return Response.json(spec);
}
