import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal";
import { BOOKINGS_URL } from "@/lib/booking";
import { useBookingModal } from "@/components/BookingModal";

export interface SpecialistItem {
  title: string;
  desc: string;
  image: string;
  imageAlt?: string;
  href?: string;
}

/** Staggered 3-column specialist cards with 3:4 imagery — mirrors the homepage .spc grid. */
export function SpecialistGrid({ items }: { items: SpecialistItem[] }) {
  const { openBookingModal } = useBookingModal();

  return (
    <Reveal className="ds-spec-grid" stagger={0.13} y={58}>
      {items.map((item, i) => {
        const inner = (
          <>
            <div className="ds-spc-img">
              <Image src={item.image} alt={item.imageAlt ?? item.title} fill sizes="(max-width: 1000px) 100vw, 33vw" style={{ objectFit: "cover" }} />
            </div>
            <div className="ds-spc-n">{String(i + 1).padStart(2, "0")}</div>
            <div className="ds-spc-t">{item.title}</div>
            <div className="ds-spc-d">{item.desc}</div>
          </>
        );
        if (item.href === BOOKINGS_URL) {
          return (
            <button key={item.title} type="button" onClick={openBookingModal} className="ds-spc text-left w-full">
              {inner}
            </button>
          );
        }
        return item.href ? (
          <Link key={item.title} href={item.href} className="ds-spc">{inner}</Link>
        ) : (
          <div key={item.title} className="ds-spc">{inner}</div>
        );
      })}
    </Reveal>
  );
}

export default SpecialistGrid;
