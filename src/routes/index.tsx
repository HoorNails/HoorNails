import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";

const INSTAGRAM_URL = "https://www.instagram.com/hoornails.co_/";
const DM_URL = "https://ig.me/m/hoornails.co_";

type Nail = PublicProduct;

const productsQueryOptions = queryOptions({
  queryKey: ["public-products"],
  queryFn: () => listPublicProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "hoor nails — Nail Catalogue" },
      {
        name: "description",
        content: "Browse our nail designs and order via Instagram DM. By hoornails.co_",
      },
      { property: "og:title", content: "hoor nails — Nail Catalogue" },
      {
        property: "og:description",
        content: "Browse our nail designs and order via Instagram DM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:wght@500;600;700&family=Quicksand:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Catalogue />
      <FooterDM />
    </main>
  );
}

function Hero() {
  return (
    <header className="relative overflow-hidden px-5 pt-12 pb-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-blush)" }}
      />
      <div className="pointer-events-none absolute -top-16 left-1/2 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/50 blur-3xl" />
      <p className="font-body text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
        Nail Catalogue
      </p>
      <h1 className="mt-3 font-script text-6xl leading-none text-rose drop-shadow-sm">
        hoor nails
      </h1>
      <p className="mx-auto mt-4 max-w-xs font-body text-sm leading-relaxed text-muted-foreground">
        Swipe through our latest sets. Love one? Slide to DM and we'll book you in.
      </p>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose/30 bg-card px-4 py-2 font-body text-xs font-semibold text-rose transition-colors hover:bg-accent"
      >
        <InstagramGlyph className="h-3.5 w-3.5" />
        @hoornails.co_
      </a>
    </header>
  );
}

function Catalogue() {
  const { data: nails } = useSuspenseQuery(productsQueryOptions);

  return (
    <section className="px-5 pb-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">The Sets</h2>
          <span className="font-body text-xs text-muted-foreground">{nails.length} designs</span>
        </div>
        {nails.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center font-body text-sm text-muted-foreground">
            New sets coming soon — slide to DM for bookings.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {nails.map((nail) => (
              <NailCard key={nail.id} nail={nail} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function NailCard({ nail }: { nail: Nail }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <PhotoSlot name={nail.name} imageUrl={nail.image_url} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[0.95rem] font-semibold leading-tight text-foreground">
            {nail.name}
          </h3>
          <span className="shrink-0 font-body text-sm font-bold text-rose">{nail.price}</span>
        </div>
        <p className="font-body text-[0.72rem] leading-snug text-muted-foreground">{nail.note}</p>
        <SlideToDM label={`Order ${nail.name}`} />
      </div>
    </article>
  );
}

function PhotoSlot({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={imageUrl}
          alt={`${name} nail set by hoor nails`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="photo-slot relative flex aspect-[4/5] items-center justify-center overflow-hidden"
      aria-label={`Photo placeholder for ${name}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{ background: "var(--gradient-rose)" }}
      />
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
        <span className="font-script text-3xl leading-none text-white/95 drop-shadow-sm">
          {name}
        </span>
        <span className="font-body text-[0.6rem] uppercase tracking-[0.25em] text-white/80">
          add your photo
        </span>
      </div>
    </div>
  );
}

function SlideToDM({ label }: { label: string }) {
  const [slid, setSlid] = useState(false);

  const handleSlide = () => {
    if (slid) return;
    setSlid(true);
    window.setTimeout(() => {
      window.open(DM_URL, "_blank", "noopener,noreferrer");
    }, 480);
    window.setTimeout(() => setSlid(false), 4200);
  };

  return (
    <button
      type="button"
      onClick={handleSlide}
      aria-label={slid ? `Opening Instagram DM for ${label}` : `Slide to DM to order: ${label}`}
      className="slide-track mt-1 flex h-11 w-full items-center rounded-full bg-secondary"
    >
      {/* fill */}
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: slid ? "100%" : "0%" }}
      />
      {/* knob */}
      <span
        className="absolute top-1 flex h-9 items-center justify-center rounded-full bg-card shadow-md transition-[left] duration-500 ease-out"
        style={{ left: slid ? "calc(100% - 2.75rem)" : "0.25rem", width: "2.25rem" }}
      >
        <InstagramGlyph className="h-4 w-4 text-rose" />
      </span>
      {/* label */}
      <span
        className={`relative z-10 ml-14 font-body text-xs font-semibold transition-opacity duration-300 ${
          slid ? "text-primary-foreground" : "text-secondary-foreground"
        }`}
      >
        {slid ? "Opening DM…" : "Slide to DM"}
      </span>
    </button>
  );
}

function FooterDM() {
  const [slid, setSlid] = useState(false);
  const handleSlide = () => {
    if (slid) return;
    setSlid(true);
    window.setTimeout(() => {
      window.open(DM_URL, "_blank", "noopener,noreferrer");
    }, 480);
    window.setTimeout(() => setSlid(false), 4200);
  };

  return (
    <footer className="px-5 pb-12 pt-2">
      <div className="mx-auto max-w-md">
        <p className="mb-3 text-center font-body text-xs text-muted-foreground">
          Not sure which set? Slide to DM and we'll help you choose.
        </p>
        <button
          type="button"
          onClick={handleSlide}
          aria-label={slid ? "Opening Instagram DM" : "Slide to DM"}
          className="slide-track relative flex h-14 w-full items-center rounded-full bg-secondary"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: slid ? "100%" : "0%" }}
          />
          <span
            className="absolute top-1.5 flex h-11 items-center justify-center rounded-full bg-card shadow-md transition-[left] duration-500 ease-out"
            style={{ left: slid ? "calc(100% - 3.25rem)" : "0.375rem", width: "2.75rem" }}
          >
            <InstagramGlyph className="h-5 w-5 text-rose" />
          </span>
          <span
            className={`relative z-10 ml-20 font-body text-sm font-bold tracking-wide transition-colors duration-300 ${
              slid ? "text-primary-foreground" : "text-secondary-foreground"
            }`}
          >
            {slid ? "Opening Instagram DM…" : "SLIDE TO DM"}
          </span>
        </button>
        <p className="mt-5 text-center font-body text-[0.65rem] text-muted-foreground">
          hoor nails · book via Instagram · prices may vary by length & detail
        </p>
      </div>
    </footer>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}
