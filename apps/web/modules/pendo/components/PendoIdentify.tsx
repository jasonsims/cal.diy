"use client";

import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function PendoIdentify(): null {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  // This renders on every page, so only query viewer.me once there is a session: signed-out visitors to
  // public booking pages would otherwise send a request that fails as UNAUTHORIZED.
  const { data: me } = trpc.viewer.me.get.useQuery(undefined, { enabled: isAuthenticated });
  const role = session?.user.role;

  useEffect(() => {
    if (!isAuthenticated || !me) return;

    const userMetadata = userMetadataSchema.safeParse(me.metadata).data;

    window.pendo?.identify({
      visitor: {
        id: me.id,
        email: me.email,
        full_name: me.name,
        uuid: me.uuid,
        username: me.username,
        role,
        createdDate: me.createdDate.toISOString(),
        completedOnboarding: me.completedOnboarding,
        lastActiveAt: me.lastActiveAt?.toISOString() ?? null,
        emailVerified: me.emailVerified?.toISOString() ?? null,
        identityProvider: me.identityProvider,
        twoFactorEnabled: me.twoFactorEnabled,
        timeZone: me.timeZone,
        locale: me.locale,
        weekStart: me.weekStart,
        timeFormat: me.timeFormat,
        appTheme: me.appTheme,
        theme: me.theme,
        hideBranding: me.hideBranding,
        allowDynamicBooking: me.allowDynamicBooking,
        allowSEOIndexing: me.allowSEOIndexing,
        receiveMonthlyDigestEmail: me.receiveMonthlyDigestEmail,
        requiresBookerEmailVerification: me.requiresBookerEmailVerification,
        defaultConferencingApp: userMetadata?.defaultConferencingApp?.appSlug,
        sessionTimeout: userMetadata?.sessionTimeout,
        defaultBookerLayout: me.defaultBookerLayouts?.defaultLayout,
      },
    });
  }, [isAuthenticated, me, role]);

  return null;
}
