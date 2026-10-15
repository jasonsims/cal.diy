"use client";

import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { PendoVisitor } from "@lib/pendo";
import { clearIdentifiedPendoSession, identifyPendoVisitor, onPendoReady } from "@lib/pendo";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

type MeQueryData = RouterOutputs["viewer"]["me"]["get"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDefaultConferencingAppSlug(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) return undefined;
  const app = metadata.defaultConferencingApp;
  if (!isRecord(app) || typeof app.appSlug !== "string") return undefined;
  return app.appSlug;
}

function buildPendoVisitor(user: Session["user"], me: MeQueryData | undefined): PendoVisitor {
  const visitor: PendoVisitor = {
    id: user.id,
    email: user.email,
    full_name: user.name,
    username: user.username,
    role: user.role,
    locale: user.locale,
  };
  // The query cache can still hold the previous account's profile right after switching users.
  if (me?.id !== user.id) return visitor;

  return {
    ...visitor,
    email: me.email,
    full_name: me.name,
    username: me.username,
    locale: me.locale,
    createdDate: me.createdDate.toISOString(),
    emailVerified: me.emailVerified?.toISOString() ?? null,
    completedOnboarding: me.completedOnboarding,
    twoFactorEnabled: me.twoFactorEnabled,
    identityProvider: me.identityProvider,
    timeZone: me.timeZone,
    timeFormat: me.timeFormat,
    weekStart: me.weekStart,
    appTheme: me.appTheme,
    theme: me.theme,
    hideBranding: me.hideBranding,
    allowDynamicBooking: me.allowDynamicBooking,
    allowSEOIndexing: me.allowSEOIndexing,
    requiresBookerEmailVerification: me.requiresBookerEmailVerification,
    defaultConferencingApp: getDefaultConferencingAppSlug(me.metadata),
    defaultBookerLayout: me.defaultBookerLayouts?.defaultLayout,
  };
}

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: status === "authenticated" });

  useEffect(() => {
    if (!session) return;
    identifyPendoVisitor(buildPendoVisitor(session.user, me));
  }, [session, me]);

  useEffect(() => {
    // Signing out redirects as soon as the session is destroyed, so the previous user's identity is cleared
    // on the next signed-out page instead, once the agent has loaded and restored the stored visitor.
    if (status !== "unauthenticated") return;
    return onPendoReady(clearIdentifiedPendoSession);
  }, [status]);

  return null;
}
