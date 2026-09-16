import { GameError, hostAction, type HostAction } from "@/lib/game";
import { HOST_HEADER, body, handle, normalizeCode } from "@/lib/http";

export const dynamic = "force-dynamic";

const ACTIONS: HostAction[] = [
  "start", "reveal", "next", "build_bracket", "reveal_match", "next_round", "finish",
];

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const hostToken = req.headers.get(HOST_HEADER);
    if (!hostToken) throw new GameError("Falta tu credencial de anfitrion.", 401);

    const b = await body<{ action?: string }>(req);
    const action = ACTIONS.find((a) => a === b.action);
    if (!action) throw new GameError("Accion desconocida.");

    return hostAction(normalizeCode(code), hostToken, action);
  });
}
