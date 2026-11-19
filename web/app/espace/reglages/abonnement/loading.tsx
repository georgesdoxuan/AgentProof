import { Columns } from "@/lib/ui";
import { Bone, Line, SkGroup, SkSpace } from "../../../skeleton";

// Same frame as the page: the meter tile and usage lists on the leading side, plan, cap and alerts beside them.
export default function Loading() {
  return (
    <SkSpace settings>
      <Columns
        main={<>
      <SkGroup>
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
      <SkGroup rows={4} />
        </>}
        side={<>
      <SkGroup rows={2} />
      <SkGroup rows={1} />
      <SkGroup rows={1} />
        </>}
      />
    </SkSpace>
  );
}
