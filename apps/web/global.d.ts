type PendoMetadataValue = string | number | boolean | null | undefined;

interface PendoVisitorMetadata {
  id: string | number;
  [field: string]: PendoMetadataValue;
}

interface PendoIdentifyOptions {
  visitor: PendoVisitorMetadata;
}

// The install snippet only stubs queueable methods like identify; the optional ones exist once the agent has loaded.
interface PendoAgent {
  identify: (options: PendoIdentifyOptions) => void;
  clearSession?: () => void;
  getVisitorId?: () => string;
  isAnonymousVisitor?: (visitorId?: string) => boolean;
  isReady?: () => boolean;
}

declare var pendo: PendoAgent | undefined;
