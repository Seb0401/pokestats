import { createRoom } from "@/lib/game";
import { body, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const b = await body<{ hostName?: string; categories?: string[] }>(req);
    return createRoom({
      hostName: (b.hostName ?? "Anfitrion").trim(),
      categorySlugs: Array.isArray(b.categories) ? b.categories : [],
    });
  });
}
