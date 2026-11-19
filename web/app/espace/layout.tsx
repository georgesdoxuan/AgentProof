import { SpaceFrame } from "./shell";

// The sidebar lives here, not in each page: it stays mounted (and still) while you move between pages.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SpaceFrame>{children}</SpaceFrame>;
}
