// Re-export shared types for internal use
export type {
  GetBlitzClientConfig,
  GetBlitzEventCallbacks,
  PaymentSessionDetails,
  PaymentEvent,
} from "@getblitz/shared-types";

// Internal widget state
export interface WidgetState {
  isLoading: boolean;
  error: string | null;
}
