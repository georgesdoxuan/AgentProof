import { SkReports } from "../skeleton";

// In a route group so it wraps only this page, not Favoris (it has its own, with a back link).
export default function Loading() {
  return <SkReports intro="chips" />;
}
