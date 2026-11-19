import { SkReports } from "../skeleton";

// In a route group so it wraps only this page, not Favoris and Corbeille (they have their own, with a back link).
export default function Loading() {
  return <SkReports intro="chips" />;
}
