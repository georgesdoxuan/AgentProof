import { getT } from "@/lib/lang";
import { SpaceShell } from "./espace/shell";

// Loading placeholders (loading.tsx of each route). Each one reuses the real page's frame and spacing, so nothing
// moves when the content arrives. Text placeholders sit inside an element with the real type style: the line keeps
// its exact height and only the words are replaced by a grey bar.

export function Bone({ className = "", w }: { className?: string; w?: string }) {
  return <span aria-hidden className={`sk block rounded-[8px] ${className}`} style={w ? { width: w } : undefined} />;
}

// One line of text, inherits the parent's font size and line height.
export function Line({ w = "100%", className = "" }: { w?: string; className?: string }) {
  return <span aria-hidden className={`sk inline-block h-[0.75em] max-w-full rounded-[6px] align-middle ${className}`} style={{ width: w }} />;
}

// Wraps every skeleton: tells screen readers the page is loading, once.
export async function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = await getT();
  return (
    <div aria-busy="true" className={className}>
      <p role="status" className="sr-only">
        {t("Chargement de la page…", "Loading the page…")}
      </p>
      {children}
    </div>
  );
}

const W = ["46%", "62%", "38%", "54%", "70%", "42%", "58%", "34%"];

// Team space page: the real sidebar and header, placeholders for the title, intro and main action.
export function SkSpace({ narrow, action, children }: { narrow?: boolean; action?: boolean; children: React.ReactNode }) {
  return (
    <Loading>
      <SpaceShell
        narrow={narrow}
        title={<Line w="min(24rem, 85%)" />}
        intro={<Line w="min(36rem, 100%)" />}
        actions={action ? <Bone className="h-12 w-44 rounded-full" /> : undefined}
      >
        {children}
      </SpaceShell>
    </Loading>
  );
}

// Section heading above a group or grid (type-headline, like Group's title).
export function SkHead({ w = "8rem", aside }: { w?: string; aside?: boolean }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
      <p className="type-headline">
        <Line w={w} />
      </p>
      {aside && (
        <p className="type-small">
          <Line w="5rem" />
        </p>
      )}
    </div>
  );
}

// A row of a grouped list: title and caption on the leading side, a value or control on the trailing side.
export function SkRow({ i = 0, tall, trailing = "w-16" }: { i?: number; tall?: boolean; trailing?: string }) {
  return (
    <div className={`flex items-center gap-4 border-b border-hairline px-5 py-3 last:border-0 ${tall ? "min-h-[68px]" : "min-h-[60px]"}`}>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          <Line w={W[i % W.length]} />
        </span>
        <span className="type-small block">
          <Line w={W[(i + 3) % W.length]} className="max-w-[60%]" />
        </span>
      </span>
      <Bone className={`h-7 shrink-0 rounded-full ${trailing}`} />
    </div>
  );
}

// Same frame as lib/ui Group: optional heading, rounded list, optional footer line.
export function SkGroup({ title = true, rows = 3, tall, footer, children }: { title?: boolean; rows?: number; tall?: boolean; footer?: boolean; children?: React.ReactNode }) {
  return (
    <section>
      {title && <SkHead />}
      <div className="overflow-hidden rounded-[18px] bg-tile">
        {children ?? Array.from({ length: rows }, (_, i) => <SkRow key={i} i={i} tall={tall} />)}
      </div>
      {footer && (
        <p className="type-small mt-2.5 px-1">
          <Line w="min(30rem, 80%)" />
        </p>
      )}
    </section>
  );
}

// A form inside a group: Field-sized inputs (56px) and a pill button.
export function SkForm({ fields = 2, segmented }: { fields?: number; segmented?: boolean }) {
  return (
    <div className="grid gap-4 p-6 sm:p-8">
      {segmented && <Bone className="h-9 w-64 max-w-full rounded-[10px]" />}
      {Array.from({ length: fields }, (_, i) => (
        <Bone key={i} className="h-14 rounded-[12px]" />
      ))}
      <Bone className="h-12 w-40 rounded-full" />
    </div>
  );
}

// Settings-like pages of the space (payment, logins, automations, team, account): a list, then a form.
export function SkSettings({ rows = 3, fields = 3 }: { rows?: number; fields?: number }) {
  return (
    <SkSpace narrow>
      <SkGroup rows={rows} footer />
      <SkGroup>
        <SkForm fields={fields} />
      </SkGroup>
    </SkSpace>
  );
}

// Public page heading on the grey background: eyebrow, large title, intro paragraph.
export function SkHeader({ eyebrow = true, intro = 2 }: { eyebrow?: boolean; intro?: number }) {
  return (
    <header className="max-w-[760px]">
      {eyebrow && (
        <p className="type-eyebrow">
          <Line w="10rem" />
        </p>
      )}
      <h1 className={`type-h1 ${eyebrow ? "mt-3" : ""}`}>
        <Line w="85%" />
      </h1>
      <p className="type-intro mt-5">
        {Array.from({ length: intro }, (_, i) => (
          <Line key={i} w={i === intro - 1 ? "55%" : "100%"} />
        ))}
      </p>
    </header>
  );
}

// Ranking table (public and in-space): header row, then ranked sites.
export function SkBoard({ rows = 8 }: { rows?: number }) {
  return (
    <>
      <p className="type-small mt-8">
        <Line w="18rem" />
      </p>
      <div className="mt-4 overflow-hidden rounded-[18px] bg-tile">
        <div className="hidden h-[41px] border-b border-hairline md:block" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid min-h-[86px] grid-cols-[1.75rem_1fr_auto] items-center gap-x-4 border-b border-hairline px-6 py-5 last:border-0 max-[734px]:px-5 md:grid-cols-[1.75rem_minmax(0,1fr)_8rem_5rem]">
            <span className="text-ink-2 tnum">{i + 1}</span>
            <span className="min-w-0">
              <span className="type-headline block">
                <Line w={W[i % W.length]} />
              </span>
              <span className="type-small block">
                <Line w="9rem" />
              </span>
            </span>
            <Bone className="hidden h-1.5 rounded-full md:block" />
            <span className="text-[21px] font-semibold">
              <Line w="3.5rem" />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
