import { Bone, Line, Loading as Busy, SkHeader } from "../skeleton";

// Open sites: heading, then one row per site with its latest public report.
export default function Loading() {
  return (
    <Busy className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="mx-auto w-[min(692px,87.5%)]">
        <SkHeader eyebrow={false} intro={3} />
        <div className="mt-10 overflow-hidden rounded-[18px] bg-tile">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-[78px] items-center justify-between gap-4 border-b border-hairline px-6 py-5 last:border-0 max-[734px]:px-5">
              <span className="type-headline min-w-0 flex-1">
                <Line w={["45%", "60%", "38%", "52%"][i]} />
              </span>
              <Bone className="h-5 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Busy>
  );
}
