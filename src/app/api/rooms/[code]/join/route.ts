import { joinRoom } from "@/lib/game";
import { body, handle, normalizeCode } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const b = await body<{ nickname?: string }>(req);
    return joinRoom(normalizeCode(code), String(b.nickname ?? ""));
  });
}
