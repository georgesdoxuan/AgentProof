import { Line, SkSpace } from "../../../skeleton";

// Sites › Corbeille: one row per site in the trash.
export default function Loading() {
  return (
    <SkSpace>
      <div className="overflow-hidden rounded-[18px] bg-tile">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex min-h-[68px] items-center border-b border-hairline py-3 pl-5 pr-5 last:border-0">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                <Line w={["44%", "56%", "38%"][i]} />
              </span>
              <span className="type-small block">
                <Line w="12rem" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </SkSpace>
  );
}
