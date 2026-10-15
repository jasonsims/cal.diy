"use client";

import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react/trpc";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const AGENT_POLL_INTERVAL_MS = 500;
const AGENT_POLL_MAX_ATTEMPTS = 20;

function clearIdentifiedVisitor(): boolean {
  const pendo = window.pendo;
  if (!pendo?.isReady?.() || !pendo.getVisitorId || !pendo.isAnonymousVisitor || !pendo.clearSession) {
    return false;
  }
  // clearSession always mints a new anonymous visitor, so only call it when a signed-in visitor is still attached.
  if (!pendo.isAnonymousVisitor(pendo.getVisitorId())) {
    pendo.clearSession();
  }
  return true;
}

export function PendoVisitorSync(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const sessionUserId = session?.user?.id;
  const role = session?.user?.role;
  const { data: user } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    // Cached viewer.me data can belong to the previous user until the query refetches after a new sign-in.
    if (!isAuthenticated || !user || user.id !== sessionUserId) return;

    const metadata = userMetadata.safeParse(user.metadata).data;

    window.pendo?.identify({
      visitor: {
        id: user.id,
        email: user.email,
        full_name: user.name,
        role,
        createdDate: user.createdDate.toISOString(),
        completedOnboarding: user.completedOnboarding,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
        twoFactorEnabled: user.twoFactorEnabled,
        identityProvider: user.identityProvider,
        username: user.username,
        locale: user.locale,
        timeZone: user.timeZone,
        timeFormat: user.timeFormat,
        weekStart: user.weekStart,
        appTheme: user.appTheme,
        theme: user.theme,
        hideBranding: user.hideBranding,
        allowDynamicBooking: user.allowDynamicBooking,
        allowSEOIndexing: user.allowSEOIndexing,
        receiveMonthlyDigestEmail: user.receiveMonthlyDigestEmail,
        requiresBookerEmailVerification: user.requiresBookerEmailVerification,
        defaultConferencingApp: metadata?.defaultConferencingApp?.appSlug,
        sessionTimeout: metadata?.sessionTimeout,
      },
    });
  }, [isAuthenticated, user, sessionUserId, role]);

  useEffect(() => {
    // Every sign-out path ends on a page whose session is unauthenticated, but that page usually loads before the
    // Pendo agent does, and clearSession is not one of the calls the install snippet queues, so wait for the agent.
    if (status !== "unauthenticated" || clearIdentifiedVisitor()) return;

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (clearIdentifiedVisitor() || attempts >= AGENT_POLL_MAX_ATTEMPTS) {
        window.clearInterval(intervalId);
      }
    }, AGENT_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [status]);

  return null;
}
