import { notFound } from "next/navigation";

// Any unknown address under /espace: the space's own « not found » page, inside the sidebar (not the bare site one).
export default function Unknown() {
  notFound();
}
