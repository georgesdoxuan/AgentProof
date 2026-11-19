import { getLang } from "@/lib/lang";
import { HelpCenter } from "./help";
import { estimateMinutes, loadPace, minutesLabel } from "@/lib/estimate";

export async function generateMetadata() {
  return { title: `${(await getLang()) === "en" ? "Help" : "Aide"} · AgentProof` };
}

// Help centre, reached from the "?" in the header. Public: questions come before signing up too.
// The questions and the search live in lib/faq.ts; the search runs in the browser.
export default async function Faq({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const lang = await getLang();
  const [q, pace] = await Promise.all([searchParams.then((p) => p.q ?? ""), loadPace()]);
  return (
    <div className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <div className="wrap max-w-[760px]">
        <HelpCenter lang={lang} initial={q.slice(0, 200)} duration={minutesLabel(estimateMinutes(5, pace.desktop))} />
      </div>
    </div>
  );
}
