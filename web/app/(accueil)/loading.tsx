import { Bone, Line, Loading as Busy } from "../skeleton";

// Home: the hero (title, subtitle, actions) above the browser frame.
export default function Loading() {
  return (
    <Busy>
      <section className="overflow-hidden pt-[88px] text-center max-[734px]:pt-14">
        <div className="wrap">
          <p className="type-hero">
            <Line w="90%" />
            <Line w="60%" />
          </p>
          <p className="type-subhead mx-auto mt-5 max-w-[640px]">
            <Line w="85%" />
            <Line w="55%" />
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-[17px] gap-y-2">
            <Bone className="h-12 w-44 rounded-full" />
            <span className="flex h-11 items-center">
              <Line w="13rem" className="h-[17px]" />
            </span>
            <span className="flex h-11 items-center">
              <Line w="9rem" className="h-[17px]" />
            </span>
          </div>
        </div>
        <div className="mx-auto mt-16 w-[min(1080px,92%)] max-[734px]:mt-12">
          <div className="overflow-hidden rounded-[12px] bg-tile shadow-[var(--shot-shadow)]">
            <div className="h-9 border-b border-hairline bg-bg-2 dark:bg-[#2a2a2c]" />
            <Bone className="aspect-[16/9] rounded-none" />
          </div>
        </div>
      </section>
    </Busy>
  );
}
