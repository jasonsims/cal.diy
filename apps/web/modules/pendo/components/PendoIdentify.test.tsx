import { IdentityProvider } from "@calcom/prisma/enums";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { render } from "@testing-library/react";
import { useSession } from "next-auth/react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendoIdentify } from "./PendoIdentify";

const mockUseMeQuery: Mock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: { viewer: { me: { get: { useQuery: mockUseMeQuery } } } },
}));

const VISITOR_UUID = "8f14e45f-ceea-4e7a-9b1d-2c3a4b5c6d7e";

const me: Partial<RouterOutputs["viewer"]["me"]["get"]> = {
  id: 12345,
  uuid: VISITOR_UUID,
  email: "user_12345@example.com",
  name: "Sample User",
  username: "user-12345",
  createdDate: new Date("2025-01-15T10:30:00.000Z"),
  completedOnboarding: true,
  lastActiveAt: new Date("2025-03-02T14:05:00.000Z"),
  emailVerified: null,
  identityProvider: IdentityProvider.CAL,
  twoFactorEnabled: false,
  timeZone: "America/New_York",
  locale: "en",
  weekStart: "Monday",
  timeFormat: 24,
  appTheme: "dark",
  theme: null,
  hideBranding: false,
  allowDynamicBooking: true,
  allowSEOIndexing: true,
  receiveMonthlyDigestEmail: true,
  requiresBookerEmailVerification: false,
  metadata: { defaultConferencingApp: { appSlug: "daily-video" }, sessionTimeout: 60 },
  defaultBookerLayouts: {
    enabledLayouts: [BookerLayouts.MONTH_VIEW],
    defaultLayout: BookerLayouts.MONTH_VIEW,
  },
};

describe("PendoIdentify", () => {
  const identify = vi.fn();

  beforeEach(() => {
    window.pendo = { identify };
  });

  afterEach(() => {
    window.pendo = undefined;
    vi.clearAllMocks();
  });

  it("identifies the signed-in user with their visitor metadata", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      data: {
        expires: "2099-01-01T00:00:00.000Z",
        hasValidLicense: false,
        upId: "usr-12345",
        user: { id: 12345, uuid: VISITOR_UUID, role: "USER" },
      },
      update: vi.fn(),
    });
    mockUseMeQuery.mockReturnValue({ data: me });

    render(<PendoIdentify />);

    expect(mockUseMeQuery).toHaveBeenCalledWith(undefined, { enabled: true });
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith({
      visitor: {
        id: 12345,
        email: "user_12345@example.com",
        full_name: "Sample User",
        uuid: VISITOR_UUID,
        username: "user-12345",
        role: "USER",
        createdDate: "2025-01-15T10:30:00.000Z",
        completedOnboarding: true,
        lastActiveAt: "2025-03-02T14:05:00.000Z",
        emailVerified: null,
        identityProvider: "CAL",
        twoFactorEnabled: false,
        timeZone: "America/New_York",
        locale: "en",
        weekStart: "Monday",
        timeFormat: 24,
        appTheme: "dark",
        theme: null,
        hideBranding: false,
        allowDynamicBooking: true,
        allowSEOIndexing: true,
        receiveMonthlyDigestEmail: true,
        requiresBookerEmailVerification: false,
        defaultConferencingApp: "daily-video",
        sessionTimeout: 60,
        defaultBookerLayout: "month_view",
      },
    });
  });

  it("neither queries viewer.me nor identifies a signed-out visitor", () => {
    vi.mocked(useSession).mockReturnValue({ status: "unauthenticated", data: null, update: vi.fn() });
    mockUseMeQuery.mockReturnValue({ data: undefined });

    render(<PendoIdentify />);

    expect(mockUseMeQuery).toHaveBeenCalledWith(undefined, { enabled: false });
    expect(identify).not.toHaveBeenCalled();
  });

  it("does nothing when the Pendo snippet isn't on the page", () => {
    window.pendo = undefined;
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      data: {
        expires: "2099-01-01T00:00:00.000Z",
        hasValidLicense: false,
        upId: "usr-12345",
        user: { id: 12345, uuid: VISITOR_UUID },
      },
      update: vi.fn(),
    });
    mockUseMeQuery.mockReturnValue({ data: me });

    expect(() => render(<PendoIdentify />)).not.toThrow();
  });
});
