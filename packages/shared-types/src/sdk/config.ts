import { z } from "zod/v4";

// SDK initialization options
export const GetBlitzClientConfigSchema = z.object({
  sessionId: z.uuid().describe("Payment session ID"),
  clientToken: z.string().describe("Client token"),
  wssUrl: z.url().optional().describe("WebSocket server URL"),
  apiUrl: z.url().optional().describe("API base URL"),
  theme: z.enum(["light", "dark", "auto"]).optional().describe("Widget theme"),
  locale: z.string().optional().describe("Locale for i18n"),
});
export type GetBlitzClientConfig = z.infer<typeof GetBlitzClientConfigSchema>;

// SDK event callbacks
export interface GetBlitzEventCallbacks {
  onSuccess?: (token: string) => void;
  onPartial?: () => void;
  onError?: (error: Error) => void;
  onExpired?: () => void;
  onCancel?: () => void;
}
