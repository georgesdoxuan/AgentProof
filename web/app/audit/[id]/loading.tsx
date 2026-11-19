import { Bone, Line, Loading as Busy } from "../../skeleton";

// Audit report: title block, score and missions summary, then one card per mission with its last screen.
export default function Loading() {
  return (
    <Busy className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <div className="wrap-wide space-y-16 max-[734px]:space-y-12">
        <header>
          <p className="type-eyebrow">
            <Line w="16rem" />
          </p>
          <h1 className="type-h1 mt-3">
            <Line w="min(32rem, 80%)" />
          </h1>
          <p className="mt-4">
            <Line w="min(26rem, 90%)" />
          </p>
        </header>
        <section className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="tile flex flex-col">
            <p className="type-headline">
              <Line w="8rem" />
            </p>
            <p className="mt-5 text-[96px] font-semibold leading-none max-[734px]:text-[72px]">
              <Line w="12rem" className="h-[0.8em]" />
            </p>
            <p className="mt-3">
              <Line w="75%" />
            </p>
            <div className="mt-auto pt-8">
              <Bone className="h-3 rounded-full" />
              <p className="type-small mt-3">
                <Line w="10rem" />
              </p>
              <p className="type-small mt-5 border-t border-hairline pt-5">
                <Line w="100%" />
                <Line w="20%" />
              </p>
            </div>
          </div>
          <div className="tile flex flex-col gap-4">
            <p className="type-headline">
              <Line w="9rem" />
            </p>
            {[0, 1, 2, 3, 4].map((i) => (
              <p key={i} className="type-small flex items-center gap-3">
                <Bone className="h-5 w-5 shrink-0 rounded-full" />
                <Line w={["70%", "55%", "80%", "62%", "48%"][i]} />
              </p>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-6">
            <p className="type-h2">
              <Line w="min(22rem, 80%)" />
            </p>
            <p className="mt-3">
              <Line w="min(40rem, 100%)" />
              <Line w="min(20rem, 60%)" />
            </p>
          </div>
          <div className="overflow-hidden rounded-[18px] bg-tile">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-b border-hairline px-6 py-4 last:border-0 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_7.5rem]">
                <span className="font-semibold">
                  <Line w={["70%", "55%", "62%"][i]} />
                </span>
                <Bone className="hidden h-1.5 rounded-full md:block" />
                <span className="type-small text-right">
                  <Line w="5rem" />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Busy>
  );
}
