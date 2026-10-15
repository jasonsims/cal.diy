import { unstable_cache } from "next/cache";
import { z } from "zod";

import prisma from "@calcom/prisma";

const computeInstallCountsFromDB = async (): Promise<Record<string, number>> => {
  const mostPopularApps = z.array(z.object({ appId: z.string(), installCount: z.number() })).parse(
    await prisma.$queryRaw`
    SELECT
      c."appId",
      COUNT(*)::integer AS "installCount"
    FROM
      "Credential" c
    WHERE
      c."appId" IS NOT NULL
    GROUP BY
      c."appId"
    ORDER BY
      "installCount" DESC
    `
  );
  return mostPopularApps.reduce(
    (acc, { appId, installCount }) => {
      acc[appId] = installCount;
      return acc;
    },
    {} as Record<string, number>
  );
};

const getInstallCountPerApp = async (): Promise<Record<string, number>> => {
  try {
    return await unstable_cache(async () => computeInstallCountsFromDB(), ["app-install-counts"], {
      revalidate: 300,
      tags: ["app-install-counts"],
    })();
  } catch (error) {
    // FORK: tRPC runs in Pages Router API routes, where Next 16 has no incremental cache and unstable_cache
    // throws "Invariant: incrementalCache missing". Query directly there instead of failing the request.
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return computeInstallCountsFromDB();
    }
    throw error;
  }
};

export default getInstallCountPerApp;
export { computeInstallCountsFromDB };
