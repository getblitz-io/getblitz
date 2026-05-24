"use client";

import type { ComponentType } from "react";
import { lazy } from "react";

/**
 * Props passed to any custom provider UI component.
 *
 * The component receives the current form values via `providerConfig` and
 * communicates changes back via `onConfigUpdate`. Once the custom step
 * is complete, call `onComplete()` to proceed to the standard config form.
 */
export interface CustomProviderComponentProps {
  slug: string;
  connectionId: string;
  /** Current provider config values from the parent form */
  providerConfig: Record<string, unknown>;
  /** Merge updates into the provider config (e.g. set profileId) */
  onConfigUpdate: (updates: Record<string, unknown>) => void;
  /** Signal that the custom step is done and the standard form can render */
  onComplete: () => void;
}

/**
 * Registry of custom UI components for bank providers.
 *
 * Each key maps to a component identified by `getCustomConfigComponentId()`
 * in the corresponding bank adapter. Components are lazily loaded so they
 * don't affect the main bundle.
 *
 * To add a new custom component:
 * 1. Create your React component implementing `CustomProviderComponentProps`
 * 2. Add it to COMPONENT_REGISTRY below with a unique key
 * 3. Override `getCustomConfigComponentId()` in your provider adapter to return that key
 */
const COMPONENT_REGISTRY: Record<
  string,
  ComponentType<CustomProviderComponentProps>
> = {
  "wise-profile-selector": lazy(
    () => import("./wise/WiseProfileSelector"),
  ) as ComponentType<CustomProviderComponentProps>,
  // Future providers can add their custom steps here, e.g.:
  // "stripe-connect-onboarding": lazy(() => import("./stripe/StripeOnboarding")),
};

/**
 * Look up a custom provider component by its registry ID.
 * Returns null if no component is registered for the given ID.
 */
export function getCustomProviderComponent(
  componentId: string | null | undefined,
): ComponentType<CustomProviderComponentProps> | null {
  if (!componentId) return null;
  return COMPONENT_REGISTRY[componentId] ?? null;
}
