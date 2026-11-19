import { Bone, Line, SkSpace } from "../../skeleton";

// Sites: one card per site (name, score, missions, what is left to fix).
export default function Loading() {
  return (
    <SkSpace action>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tile flex flex-col gap-6 p-7!">
            <span>
              <span className="type-headline block">
                <Line w="65%" />
              </span>
              <span className="type-small block">
                <Line w="45%" />
              </span>
            </span>
            <span className="text-[48px] font-semibold leading-none">
              <Line w="7rem" className="h-[0.85em]" />
            </span>
            <Bone className="h-1.5 rounded-full" />
            <span className="type-small grid gap-1.5">
              <Line w="100%" />
              <Line w="100%" />
            </span>
          </div>
        ))}
      </div>
    </SkSpace>
  );
}
