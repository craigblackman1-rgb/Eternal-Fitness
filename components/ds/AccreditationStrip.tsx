/* eslint-disable @next/next/no-img-element */

const accreditations = [
  { src: "/images/accreditations/fitpro.png", alt: "FitPro member", h: 34 },
];

/**
 * Accreditation logo row — registered/accredited bodies. Muted by default,
 * full colour on hover. `variant="footer"` renders smaller on dark.
 */
export function AccreditationStrip({ variant = "light" }: { variant?: "light" | "footer" }) {
  if (variant === "footer") {
    return (
      <div className="flex items-center gap-6 flex-wrap">
        {accreditations.map((a) => (
          <img
            key={a.src}
            src={a.src}
            alt={a.alt}
            style={{ height: a.h * 0.72 }}
            className="w-auto invert grayscale opacity-60"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="border-t border-b border-border-warm py-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
      <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal shrink-0">
        Registered &amp; accredited
      </p>
      <div className="flex items-center gap-10 flex-wrap">
        {accreditations.map((a) => (
          <img
            key={a.src}
            src={a.src}
            alt={a.alt}
            style={{ height: a.h }}
            className="w-auto grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
          />
        ))}
      </div>
    </div>
  );
}

export default AccreditationStrip;
