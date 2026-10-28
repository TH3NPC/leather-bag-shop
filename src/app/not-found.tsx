import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60dvh] grid place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display text-[36px] mt-2">This page could not be found</h1>
        <p className="text-sm text-muted mt-2">The product may have been removed or the link is incorrect.</p>
        <Link href="/shop" className="btn btn-primary mt-7">Back to the shop</Link>
      </div>
    </div>
  );
}
