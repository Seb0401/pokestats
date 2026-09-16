import { buildState } from "@/lib/game";
import { HOST_HEADER, PLAYER_HEADER, handle, normalizeCode } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    return buildState(normalizeCode(code), {
      hostToken: req.headers.get(HOST_HEADER),
      playerToken: req.headers.get(PLAYER_HEADER),
    });
  });
}
