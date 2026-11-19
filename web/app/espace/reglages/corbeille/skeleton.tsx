import { Bone, Line, SkSpace } from "../../../skeleton";

// Réglages › Corbeille (Sites and Rapports): the category switch, then one row per item.
export function SkTrash() {
  return (
    <SkSpace narrow settings>
      <section>
        <div className="mb-3 flex min-h-9 items-center">
          <Bone className="h-[38px] w-[13rem] max-w-full rounded-[10px]" />
        </div>
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
      </section>
    </SkSpace>
  );
}
