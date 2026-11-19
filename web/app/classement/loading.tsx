import { Loading as Busy, SkBoard, SkHeader } from "../skeleton";

export default function Loading() {
  return (
    <Busy className="bg-bg-2 pb-24 pt-20 max-[734px]:pt-12">
      <div className="wrap-wide">
        <SkHeader intro={4} />
        <SkBoard />
      </div>
    </Busy>
  );
}
