import { pendo } from "@calcom/lib/pendo";
import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";

// FORK: Pendo Track Events (see FORK.md) for availability schedules. They live here rather than inline because
// the upstream components are already close to the function length lint limit.

type ScheduleUpdateInput = RouterInputs["viewer"]["availability"]["schedule"]["update"];
type ScheduleListEntry = RouterOutputs["viewer"]["availability"]["list"]["schedules"][number];
type ScheduleUpdateResult = {
  schedule: { id: number };
  prevDefaultId?: number | null;
  currentDefaultId?: number | null;
};
type AvailabilityEventSource = "availability_list" | "schedule_editor";

const trackScheduleDeleted = (
  scheduleId: number,
  deleteSource: AvailabilityEventSource,
  wasDefault?: boolean,
  remainingSchedulesCount?: number
): void =>
  pendo.track("availability_schedule_deleted", {
    scheduleId,
    deleteSource,
    wasDefault,
    remainingSchedulesCount,
  });

export const trackPendoScheduleCreated = (
  scheduleId: number,
  { fromEventType = false, sourceScheduleId }: { fromEventType?: boolean; sourceScheduleId?: number }
): void =>
  pendo.track("availability_schedule_created", {
    scheduleId,
    creationMethod: sourceScheduleId === undefined ? "new" : "duplicate",
    fromEventType,
    sourceScheduleId,
  });

export const trackPendoScheduleUpdated = (
  input: ScheduleUpdateInput,
  {
    prevDefaultId,
    currentDefaultId,
    travelSchedules,
    fromEventType,
  }: Omit<ScheduleUpdateResult, "schedule"> & { travelSchedules?: unknown[]; fromEventType?: string | null }
): void =>
  pendo.track("availability_schedule_updated", {
    scheduleId: input.scheduleId,
    timeZone: input.timeZone,
    isDefault: input.isDefault,
    defaultScheduleChanged: prevDefaultId !== currentDefaultId,
    dateOverridesCount: input.dateOverrides?.length ?? 0,
    availableDaysCount: input.schedule?.filter((day) => day.length > 0).length,
    travelSchedulesCount: travelSchedules?.length ?? 0,
    fromEventType: !!fromEventType,
  });

/** `schedulesBeforeDelete` is the list from before the optimistic removal. */
export const trackPendoScheduleDeletedFromList = (
  scheduleId: number,
  schedulesBeforeDelete: ScheduleListEntry[] | undefined
): void =>
  trackScheduleDeleted(
    scheduleId,
    "availability_list",
    schedulesBeforeDelete?.find((schedule) => schedule.id === scheduleId)?.isDefault,
    schedulesBeforeDelete ? schedulesBeforeDelete.length - 1 : undefined
  );

export const trackPendoScheduleDeletedFromEditor = (scheduleId: number, wasDefault: boolean): void =>
  trackScheduleDeleted(scheduleId, "schedule_editor", wasDefault);

/** The availability list only uses the schedule update mutation for "Set as default". */
export const trackPendoDefaultScheduleChanged = (
  { schedule, prevDefaultId, currentDefaultId }: ScheduleUpdateResult,
  availabilities: { schedules: unknown[] }
): void =>
  pendo.track("availability_default_schedule_changed", {
    scheduleId: schedule.id,
    prevDefaultId,
    currentDefaultId,
    schedulesCount: availabilities.schedules.length,
  });

export const trackPendoBulkAppliedToEventTypes = (
  source: AvailabilityEventSource,
  eventTypeIds: number[],
  availableEventTypes: unknown[] | undefined,
  selectedDefaultScheduleId?: number
): void =>
  pendo.track("availability_bulk_applied_to_event_types", {
    eventTypeCount: eventTypeIds.length,
    selectedDefaultScheduleId,
    availableEventTypesCount: availableEventTypes?.length,
    source,
  });
