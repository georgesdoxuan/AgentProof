import { Bone, Line, SkGroup, SkSpace } from "../../skeleton";

// Same frame as the page: the meter tile, then the plan and usage lists.
export default function Loading() {
  return (
    <SkSpace narrow>
      <SkGroup footer>
        <div className="grid gap-5 p-6 sm:p-8">
          <p className="type-title">
            <Line w="12rem" />
          </p>
          <Bone className="h-2.5 rounded-full" />
          <div className="grid gap-3 sm:grid-cols-3">
            {["5rem", "7rem", "8rem"].map((w) => (
              <p key={w}>
                <Line w={w} />
              </p>
            ))}
          </div>
        </div>
      </SkGroup>
      <SkGroup rows={2} />
      <SkGroup rows={4} footer />
    </SkSpace>
  );
}
