import type messages from "./messages/en";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
  }
}
