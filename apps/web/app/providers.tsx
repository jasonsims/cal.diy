"use client";

import { NotificationSoundHandler } from "@calcom/web/components/notification-sound-handler";
import { WebPushProvider } from "@calcom/web/modules/notifications/components/WebPushContext";
import { PendoIdentify } from "@calcom/web/modules/pendo/components/PendoIdentify";
import { ToastProvider } from "@coss/ui/components/toast";
import useIsBookingPage from "@lib/hooks/useIsBookingPage";
import { TrpcProvider } from "app/_trpc/trpc-provider";
import { SessionProvider } from "next-auth/react";
import CacheProvider from "react-inlinesvg/provider";
import { GeoProvider } from "./GeoContext";

type ProvidersProps = {
  isEmbed: boolean;
  children: React.ReactNode;
  nonce: string | undefined;
  country: string;
};
export function Providers({ isEmbed, children, country }: ProvidersProps) {
  const isBookingPage = useIsBookingPage();

  return (
    <GeoProvider country={country}>
      <SessionProvider>
        <TrpcProvider>
          {/* FORK: identifies the signed-in user to Pendo; see modules/pendo */}
          <PendoIdentify />
          <ToastProvider position="bottom-center">
            {!isEmbed && !isBookingPage && <NotificationSoundHandler />}
            {/* @ts-expect-error react-inlinesvg/provider is incompatible with @types/react@18.0.26. Remove when these types are compatible. */}
            <CacheProvider>
              <WebPushProvider>{children}</WebPushProvider>
            </CacheProvider>
          </ToastProvider>
        </TrpcProvider>
      </SessionProvider>
    </GeoProvider>
  );
}
