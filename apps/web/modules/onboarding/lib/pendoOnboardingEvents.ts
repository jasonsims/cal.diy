import type { PendoTrackProperties } from "@calcom/lib/pendo";
import { pendo } from "@calcom/lib/pendo";

// FORK: Pendo Track Events (see FORK.md) for the v3 onboarding steps, in order: plan selection, personal
// details, then connecting a calendar. Kept here so the step views stay under the function length lint limit.

const ONBOARDING_STEP_INDEX = {
  plan_selection: 1,
  personal_settings: 2,
  connect_calendar: 3,
} as const;

export const trackPendoOnboardingStep = (
  step: keyof typeof ONBOARDING_STEP_INDEX,
  properties: PendoTrackProperties = {}
): void =>
  pendo.track("onboarding_step_completed", {
    step,
    step_index: ONBOARDING_STEP_INDEX[step],
    was_skipped: false,
    ...properties,
  });

export const trackPendoPersonalSettingsStep = ({
  bio,
  avatar,
  username,
}: {
  bio?: string;
  avatar: string;
  username?: string | null;
}): void =>
  trackPendoOnboardingStep("personal_settings", {
    hasAvatar: !!avatar,
    hasBio: !!bio?.trim(),
    usernameSet: !!username,
  });
