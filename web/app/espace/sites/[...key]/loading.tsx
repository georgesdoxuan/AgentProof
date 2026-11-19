import { Bone, Line, SkGroup, SkHead, SkSpace } from "../../../skeleton";

// One site: score and trend side by side, the fixes, then its audits.
export default function Loading() {
  return (
    <SkSpace compact action parent intro="chips" logo>
      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0">
        <div className="tile flex flex-col p-7! max-[734px]:p-6!">
          <p className="type-headline">
            <Line w="8rem" />
          </p>
          <p className="mt-4 text-[56px] font-semibold leading-none max-[734px]:text-[48px]">
            <Line w="11rem" className="h-[0.8em]" />
          </p>
          <div className="mt-auto pt-6">
            <Bone className="h-3 rounded-full" />
            <p className="mt-6">
              <Line w="12rem" />
            </p>
          </div>
        </div>
        <div className="tile flex flex-col p-7! max-[734px]:p-6!">
          <p className="type-headline">
            <Line w="6rem" />
          </p>
          <div className="mt-4 flex h-36 items-end gap-3">
            {[55, 70, 45, 80, 65].map((h, i) => (
              <span key={i} className="sk block flex-1 rounded-[6px]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </section>
      <section>
        <SkHead w="7rem" />
        <div className="tile">
          <p className="type-headline">
            <Line w="60%" />
          </p>
          <p className="type-small mt-2">
            <Line w="100%" />
            <Line w="45%" />
          </p>
        </div>
      </section>
      <SkGroup rows={3} />
    </SkSpace>
  );
}
