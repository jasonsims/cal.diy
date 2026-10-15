import { useState } from "react";
import type { z } from "zod";

import { createEventTypeInput } from "@calcom/features/eventtypes/lib/types";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { pendo } from "@calcom/lib/pendo";
import type { EventType } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { useCreateEventTypeForm } from "@calcom/atoms/hooks/event-types/private/useCreateEventTypeForm";

export const useCreateEventType = (
  onSuccessMutation: (eventType: EventType) => void,
  onErrorMutation: (message: string) => void
) => {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const { form, isManagedEventType } = useCreateEventTypeForm();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const createMutation = trpc.viewer.eventTypesHeavy.create.useMutation({
    onSuccess: async ({ eventType }, variables) => {
      onSuccessMutation(eventType);
      // FORK: Pendo track event. Onboarding creates its default event types with a separate mutation, so
      // they aren't counted here.
      pendo.track("event_type_created", {
        eventTypeId: eventType.id,
        length: eventType.length,
        hidden: eventType.hidden,
        schedulingType: eventType.schedulingType,
        teamId: eventType.teamId,
        locationTypes: variables.locations?.map((location) => location.type),
        hasDescription: !!eventType.description,
        slugEdited: form.getFieldState("slug").isTouched,
      });

      await utils.viewer.eventTypes.getEventTypesFromGroup.fetchInfinite({
        group: { teamId: eventType.teamId, parentId: eventType.parentId },
        searchQuery: debouncedSearchTerm,
        limit: 10,
      });

      form.reset();
    },
    onError: (err) => {
      let error = err.message;
      if (err instanceof HttpError) {
        error = `${err.statusCode}: ${err.message}`;
      }

      if (err.data?.code === "BAD_REQUEST") {
        error = `${err.data.code}: ${t("error_event_type_url_duplicate")}`;
      }

      if (err.data?.code === "UNAUTHORIZED") {
        error = `${err.data.code}: ${t("error_event_type_unauthorized_create")}`;
      }
      onErrorMutation(error);
    },
  });

  return { form, createMutation, isManagedEventType };
};
