// Defined by the install snippet in ./components/PendoScript.tsx, which only the App Router root layout
// renders, so it is undefined on Pages Router pages and in unit tests.
declare var pendo: PendoAgent | undefined;

type PendoMetadataValue = string | number | boolean | null | undefined;

interface PendoVisitor {
  id: string | number;
  [key: string]: PendoMetadataValue;
}

interface PendoAgent {
  identify(options: { visitor: PendoVisitor }): void;
  // The snippet's pre-load stub doesn't include clearSession, so it only exists once the agent has loaded.
  clearSession?: () => void;
}
