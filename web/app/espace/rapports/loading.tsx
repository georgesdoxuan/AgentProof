import { Bone, Line, SkSpace } from "../../skeleton";

// Reports (and its Favorites and Trash sub-sections): filters, then one row per audit.
export default function Loading() {
  return (
    <SkSpace>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <Bone className="h-[38px] w-[17rem] max-w-full rounded-[10px] lg:hidden" />
          <Bone className="h-[38px] w-[15rem] max-w-full rounded-[10px]" />
        </div>
        <div className="overflow-hidden rounded-[18px] bg-tile">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid min-h-[68px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 border-b border-hairline py-3 pl-5 pr-5 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_8rem_5.5rem]">
              <span className="min-w-0">
                <span className="block font-semibold">
                  <Line w={["52%", "40%", "64%", "46%", "58%", "36%"][i]} />
                </span>
                <span className="type-small block">
                  <Line w="7rem" />
                </span>
              </span>
              <Bone className="hidden h-1.5 rounded-full md:block" />
              <span className="type-small hidden md:block">
                <Line w="5rem" />
              </span>
              <span className="font-semibold">
                <Line w="3rem" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </SkSpace>
  );
}
