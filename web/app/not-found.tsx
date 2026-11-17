import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-bg-2 py-40 text-center max-[734px]:py-28">
      <div className="wrap">
        <h1 className="type-h1">Page introuvable.</h1>
        <p className="type-intro mt-4 text-ink-2">Ce rapport ou ce replay n&apos;existe pas, ou plus.</p>
        <Link href="/classement" className="more type-intro mt-4">
          Voir le classement
        </Link>
      </div>
    </div>
  );
}
