import type { BookingCreateBody } from "@calcom/features/bookings/types";
import { pendo } from "@calcom/lib/pendo";
import type { BookingStatus } from "@calcom/prisma/enums";

// FORK: Pendo Track Events (see FORK.md) for the public Booker. The sdkActionManager events fired next to these
// only reach embed parent pages and per-event-type analytics apps, never Pendo.

type CreatedBooking = {
  uid?: string;
  status?: BookingStatus;
  startTime: string;
  endTime: string;
  paymentRequired?: boolean;
  userPrimaryEmail?: string | null;
  user?: { email?: string | null } | null;
};

type TrackBookingSucceededParams = {
  booking: CreatedBooking;
  bookingInput?: BookingCreateBody;
  isRescheduling: boolean;
  isRecurring: boolean;
  requiresConfirmation?: boolean;
  isDynamic?: boolean;
  layout?: string;
  previousStartTime?: Date | string | null;
};

type TrackBookingFailedParams = {
  error: unknown;
  bookingInput?: BookingCreateBody;
  isRescheduling: boolean;
  isRecurring: boolean;
};

const minutesBetween = (start: Date | string, end: Date | string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);

export const trackPendoBookingSucceeded = ({
  booking,
  bookingInput,
  isRescheduling,
  isRecurring,
  requiresConfirmation,
  isDynamic,
  layout,
  previousStartTime,
}: TrackBookingSucceededParams): void => {
  const duration = minutesBetween(booking.startTime, booking.endTime);

  if (isRescheduling) {
    const rescheduledBy = bookingInput?.rescheduledBy;
    pendo.track("booking_rescheduled", {
      bookingUid: booking.uid,
      rescheduleUid: bookingInput?.rescheduleUid,
      eventTypeId: bookingInput?.eventTypeId,
      duration,
      status: booking.status,
      // Compared here so that no email address is sent to Pendo.
      rescheduledByOrganizer:
        !!rescheduledBy &&
        (rescheduledBy === booking.userPrimaryEmail || rescheduledBy === booking.user?.email),
      isRecurring,
      daysMoved: previousStartTime
        ? Math.round(minutesBetween(previousStartTime, booking.startTime) / 1440)
        : undefined,
    });
    return;
  }

  pendo.track("booking_created", {
    bookingUid: booking.uid,
    eventTypeId: bookingInput?.eventTypeId,
    eventSlug: bookingInput?.eventTypeSlug,
    duration,
    status: booking.status,
    requiresConfirmation,
    paymentRequired: booking.paymentRequired,
    isRecurring,
    isDynamic,
    isPrivateLink: !!bookingInput?.hasHashedBookingLink,
    isEmbed: !!window.isEmbed?.(),
    layout,
    timeZone: bookingInput?.timeZone,
    leadTimeHours: Math.round(minutesBetween(new Date(), booking.startTime) / 60),
    utm_source: bookingInput?.tracking?.utm_source?.slice(0, 50),
    utm_medium: bookingInput?.tracking?.utm_medium?.slice(0, 50),
    utm_campaign: bookingInput?.tracking?.utm_campaign?.slice(0, 50),
  });
};

export const trackPendoBookingFailed = ({
  error,
  bookingInput,
  isRescheduling,
  isRecurring,
}: TrackBookingFailedParams): void => {
  pendo.track("booking_creation_failed", {
    eventTypeId: bookingInput?.eventTypeId,
    eventSlug: bookingInput?.eventTypeSlug,
    errorMessage: error instanceof Error ? error.message.slice(0, 100) : undefined,
    isRescheduling,
    isRecurring,
    traceId:
      error instanceof Error && "traceId" in error && typeof error.traceId === "string"
        ? error.traceId
        : undefined,
  });
};
