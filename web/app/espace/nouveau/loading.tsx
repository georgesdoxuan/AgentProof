import { Bone, Line, SkSpace } from "../../skeleton";

// New audit: site and competitor fields, the model comparison option, model and device choices, then Run.
export default function Loading() {
  return (
    <SkSpace narrow>
      <section>
        <div className="grid gap-5 rounded-[18px] bg-tile p-6 sm:p-8">
          <Bone className="h-14 rounded-[12px]" />
          <Bone className="h-14 rounded-[12px]" />
          <Bone className="h-[92px] rounded-[12px]" />
          <div className="grid gap-2">
            <p className="type-small">
              <Line w="16rem" />
            </p>
            <Bone className="h-[42px] w-[24rem] max-w-full rounded-[10px]" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Bone className="h-[42px] w-[13rem] rounded-[10px]" />
            <Bone className="h-12 w-36 rounded-full" />
          </div>
        </div>
        <p className="type-small mt-2.5 px-1">
          <Line w="100%" />
          <Line w="60%" />
        </p>
      </section>
    </SkSpace>
  );
}
