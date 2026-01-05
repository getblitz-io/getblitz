import { z } from "zod/v4";

// SDK initialization options
export const GetBlitzClientConfigSchema = z.object({
  apiKey: z.string().optional().describe("Public API key (pk_live_...)"),
  sessionId: z.uuid().describe("Payment session ID"),
  wssUrl: z.url().optional().describe("WebSocket server URL"),
  apiUrl: z.url().optional().describe("API base URL"),
  theme: z.enum(["light", "dark", "auto"]).optional().describe("Widget theme"),
  locale: z.string().optional().describe("Locale for i18n"),
});
export type GetBlitzClientConfig = z.infer<typeof GetBlitzClientConfigSchema>;

// SDK event callbacks
export interface GetBlitzEventCallbacks {
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  onExpired?: () => void;
  onCancel?: () => void;
}
