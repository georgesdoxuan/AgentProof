import { shareRun } from "@/lib/engine";

export async function GET(_req: Request, { params }: { params: Promise<{ run: string }> }) {
  const { run } = await params;
  try {
    const url = await shareRun(Number(run));
    return url ? Response.redirect(url, 302) : new Response("Replay indisponible", { status: 404 });
  } catch {
    return new Response("Replay momentanément indisponible, réessaie dans une minute.", { status: 503 });
  }
}
