import { Loading as Busy, SkBoard } from "../skeleton";
import { RankingHeader } from "./header";

export default function Loading() {
  return (
    <Busy className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <RankingHeader />
        <SkBoard />
      </div>
    </Busy>
  );
}
