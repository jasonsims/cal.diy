// FORK: Pendo Track Events (see FORK.md). The Pendo agent is installed outside this repo, so `pendo.track`
// forwards to `window.pendo` when it exists and is a no-op otherwise (SSR, platform atoms, agent not loaded).

type PendoTrackPropertyValue = string | number | boolean | null | undefined | readonly string[];

declare const window: Window & {
  pendo?: { track?: (trackType: string, metadata?: Record<string, unknown>) => void };
};

const MAX_PROPERTIES_BYTES = 512;

const getPayloadBytes = (properties: Record<string, unknown>): number =>
  new TextEncoder().encode(JSON.stringify({ properties })).length;

// Pendo caps the serialized properties at 512 bytes, so drop the largest values instead of the event.
const fitToPendoLimit = (properties: PendoTrackProperties): Record<string, unknown> => {
  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);
  const metadata: Record<string, unknown> = Object.fromEntries(entries);
  if (getPayloadBytes(metadata) <= MAX_PROPERTIES_BYTES) return metadata;

  const smallestFirst = entries.sort(([, a], [, b]) => JSON.stringify(a).length - JSON.stringify(b).length);
  while (smallestFirst.length > 0) {
    const truncated = { ...Object.fromEntries(smallestFirst), propertiesTruncated: true };
    if (getPayloadBytes(truncated) <= MAX_PROPERTIES_BYTES) return truncated;
    smallestFirst.pop();
  }
  return { propertiesTruncated: true };
};

export type PendoTrackEvent =
  | "event_type_created"
  | "event_type_duplicated"
  | "event_type_updated"
  | "event_type_deleted"
  | "event_type_visibility_toggled"
  | "booking_link_shared"
  | "embed_code_copied"
  | "event_types_searched"
  | "booking_cancelled"
  | "booking_request_responded"
  | "booking_reschedule_requested"
  | "booking_location_updated"
  | "booking_guests_added"
  | "attendee_no_show_updated"
  | "booking_reported"
  | "bookings_filtered"
  | "booking_created"
  | "booking_rescheduled"
  | "booking_creation_failed"
  | "booking_feedback_submitted"
  | "host_no_show_reported"
  | "booker_email_verified"
  | "availability_schedule_created"
  | "availability_schedule_updated"
  | "availability_schedule_deleted"
  | "availability_default_schedule_changed"
  | "availability_bulk_applied_to_event_types"
  | "out_of_office_entry_saved"
  | "out_of_office_entry_deleted"
  | "app_installed"
  | "app_uninstalled"
  | "app_enabled_on_event_types"
  | "event_type_app_toggled"
  | "default_conferencing_app_updated"
  | "default_location_applied_to_event_types"
  | "calendar_conflict_check_toggled"
  | "destination_calendar_set"
  | "app_store_searched"
  | "profile_updated"
  | "username_changed"
  | "account_deleted"
  | "general_settings_updated"
  | "appearance_settings_updated"
  | "password_changed"
  | "two_factor_auth_enabled"
  | "two_factor_auth_disabled"
  | "push_notifications_toggled"
  | "user_signed_up"
  | "signup_failed"
  | "user_logged_in"
  | "login_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "oauth_consent_decision"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "api_key_created"
  | "api_key_deleted"
  | "webhook_created"
  | "webhook_deleted"
  | "webhook_test_ping_sent"
  | "oauth_client_submitted"
  | "admin_feature_flag_toggled"
  | "admin_app_toggled"
  | "admin_user_created"
  | "admin_user_account_action"
  | "admin_oauth_client_reviewed"
  | "cal_video_meeting_joined"
  | "cal_video_meeting_left"
  | "command_palette_action_selected"
  | "command_palette_search_no_results";

export type PendoTrackProperties = Record<string, PendoTrackPropertyValue>;

export const pendo = {
  track: (trackType: PendoTrackEvent, properties: PendoTrackProperties = {}): void => {
    if (typeof window === "undefined") return;
    try {
      window.pendo?.track?.(trackType, fitToPendoLimit(properties));
    } catch {
      // Analytics must never break the user flow that triggered the event.
    }
  },
};
