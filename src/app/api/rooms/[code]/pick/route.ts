import { GameError, submitPick } from "@/lib/game";
import { PLAYER_HEADER, body, handle, normalizeCode } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const playerToken = req.headers.get(PLAYER_HEADER);
    if (!playerToken) throw new GameError("Falta tu credencial de jugador.", 401);

    const b = await body<{ pokemon?: string }>(req);
    if (!b.pokemon) throw new GameError("No enviaste ningun Pokemon.");

    return submitPick(normalizeCode(code), playerToken, b.pokemon);
  });
}
