import { Bone, Line, SkHead, SkSpace } from "../../skeleton";

// In a route group (no URL segment) so this skeleton wraps only the home page: at /espace it would also stand in
// for every child page (sites, rapports…) during a full load, at the wrong height.

// Space home: site tiles, then the blockers to fix first.
export default function Loading() {
  return (
    <SkSpace bare action bigChips intro={["7.5rem", "14rem", "10rem"]}>
      <section>
        <SkHead w="4rem" aside />
        <div className="grid grid-cols-2 gap-4 max-[734px]:gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tile flex flex-col gap-3 rounded-[20px]! p-5!">
              <span>
                <span className="block font-semibold">
                  <Line w="70%" />
                </span>
                <span className="type-caption block">
                  <Line w="40%" />
                </span>
              </span>
              <span className="text-[32px] font-semibold leading-none">
                <Line w="5rem" className="h-[0.85em]" />
              </span>
              <Bone className="h-1.5 rounded-full" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <SkHead w="12rem" aside />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tile flex min-h-[348px] flex-col p-7!">
              <p className="type-small">
                <Line w="55%" />
              </p>
              <p className="type-h3 mt-2 text-[24px]!">
                <Line w="80%" />
              </p>
              <p className="type-small mt-3">
                <Line w="100%" />
                <Line w="100%" />
                <Line w="65%" />
              </p>
              <p className="type-small mt-5 pl-5">
                <Line w="100%" />
                <Line w="50%" />
              </p>
              <p className="mt-auto">
                <Line w="60%" />
              </p>
            </div>
          ))}
        </div>
      </section>
    </SkSpace>
  );
}
