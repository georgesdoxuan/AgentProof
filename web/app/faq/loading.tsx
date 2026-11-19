import { Line, Loading as Busy, SkHeader } from "../skeleton";

// Help centre: a 760px column.
export default function Loading() {
  return (
    <Busy className="bg-bg-2 pb-24 pt-16 max-[734px]:pt-10">
      <div className="wrap max-w-[760px]">
        <SkHeader intro={3} />
        {[0, 1].map((s) => (
          <section key={s} className="mt-12">
            <p className="type-h3">
              <Line w="50%" />
            </p>
            <p className="mt-4">
              {[0, 1, 2, 3].map((i) => (
                <Line key={i} w={i === 3 ? "40%" : "100%"} />
              ))}
            </p>
          </section>
        ))}
      </div>
    </Busy>
  );
}
