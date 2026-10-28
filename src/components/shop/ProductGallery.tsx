"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Img { id: string; url: string; alt: string }

/** Swipeable full-width gallery on phones, main image + thumbnails on larger screens. */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) return <div className="aspect-[4/5] bg-sand" />;

  const goTo = (i: number) => {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={scroller}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar bg-sand"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
      >
        {images.map((img, i) => (
          <div key={img.id} className="relative w-full shrink-0 snap-center aspect-[4/5]">
            <Image
              src={img.url}
              alt={img.alt || `${name} — photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Dots on phones */}
          <div className="md:hidden flex justify-center gap-1.5 pt-3" aria-hidden>
            {images.map((img, i) => (
              <span key={img.id} className={`h-[3px] w-5 transition-colors ${i === active ? "bg-ink" : "bg-line-strong"}`} />
            ))}
          </div>
          {/* Thumbnails on larger screens */}
          <div className="hidden md:flex gap-3 pt-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => goTo(i)}
                className={`relative size-20 bg-sand border transition-colors ${i === active ? "border-ink" : "border-transparent hover:border-line-strong"}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
