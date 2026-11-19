import { SpaceFrame } from "./espace/shell";

// A report or a replay opened by a member of a team: the space's sidebar stays, as on every page of the space.
// Signed-out readers (shared links, the public ranking) get the bare page: SpaceFrame renders nothing around it.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SpaceFrame>{children}</SpaceFrame>;
}
