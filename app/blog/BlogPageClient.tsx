"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconSearch, IconArrowUpRight } from "@/components/icons";
import Navbar from "@/components/Navbar";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useBookingModal } from "@/components/BookingModal";

const categories = ["All", "Training", "Nutrition", "Recovery", "General"];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  author_name: string;
  author_avatar: string | null;
  category: string;
  published_at: string;
  is_featured: boolean;
}

export default function BlogPageClient({ posts }: { posts: BlogPost[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { openBookingModal } = useBookingModal();

  const filtered = posts.filter((p) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featured = posts.filter((p) => p.is_featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main id="main-content">
      {/* Hero */}
      <section className="relative min-h-[50vh] pt-[72px] flex items-center justify-center overflow-hidden">
        <Image src="/images/blog-hero.jpg" alt="One-to-one personal training session in the private Worthing studio" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-hero-overlay/55 via-hero-overlay/65 to-hero-overlay/75" />
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-4">My Blog</h1>
          <p className="text-white/70 max-w-xl mx-auto text-base md:text-lg mb-8">
            Dive into my blog for insights, tips, and advice to support your health and fitness journey.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={openBookingModal} className="ef-btn ef-btn-primary shadow-lg shadow-rose/30">
              Book a Free Consultation
            </button>
            <Link href="/about" className="ef-btn ef-btn-ghost-white">Visit the Studio</Link>
          </div>
        </div>
      </section>

      {/* Blog List */}
      <section className="ef-section px-6 md:px-12">
        <div className="max-w-[1320px] mx-auto">
          <div className="text-center mb-12">
            <div className="ef-eyebrow ef-eyebrow-rose justify-center mb-5">My Blog</div>
            <h2 className="text-3xl md:text-4xl text-foreground ef-h2 mb-4">Insights and Inspiration from My Blog</h2>
            <p className="ef-body max-w-xl mx-auto">Dive into my blog for insights, tips, and advice to elevate your health and fitness journey.</p>
          </div>

          <div className="relative max-w-md mx-auto mb-8">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search for blogs" aria-label="Search blog posts" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-full border border-border-warm bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-rose" />
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {categories.map((cat, ci) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? (ci % 2 === 0 ? "bg-teal text-white" : "bg-rose text-white") : "bg-white text-muted-foreground hover:bg-white/80 border border-border-warm"}`}>
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="ef-body text-lg">{posts.length === 0 ? "No blog posts yet. Check back soon!" : "No posts match your search."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 max-w-[1160px] mx-auto">
              {filtered.map((post) => (
                <BlogRow key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="ef-section px-6 md:px-12 bg-warm">
          <div className="max-w-[1160px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-10 gap-4">
              <h2 className="font-serif text-3xl md:text-4xl text-foreground tracking-[-0.02em]">Worth starting with</h2>
              <p className="ef-body text-sm max-w-xs sm:text-right">The posts people most often find useful before their first session.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {featured.map((post, i) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group border-t border-[#D8CFC7] pt-6 block">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-[11px] font-bold text-[var(--rose-text)] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal">{post.category}</span>
                  </div>
                  <h3 className="font-serif text-2xl text-foreground leading-snug tracking-[-0.015em] mb-3 group-hover:text-rose transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && <p className="ef-body text-sm line-clamp-2">{post.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FAQSection />
      <CTASection />
      </main>
      <Footer />
    </div>
  );
}

function BlogRow({ post }: { post: BlogPost }) {
  const date = new Date(post.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <Link href={`/blog/${post.slug}`} className="group block border-t border-border-warm pt-6">
      {post.image_url && (
        <div className="relative rounded-2xl overflow-hidden mb-5 aspect-[16/10] bg-white">
          <Image src={post.image_url} alt={post.title} fill sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw" className="object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        </div>
      )}
      <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-3">{post.category}</p>
      <h3 className="font-serif text-xl text-foreground leading-snug tracking-[-0.015em] mb-3 group-hover:text-rose transition-colors">{post.title}</h3>
      {post.excerpt && <p className="ef-body text-sm mb-4 line-clamp-2">{post.excerpt}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{post.author_name} · {date}</p>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--rose-text)]">Read <IconArrowUpRight className="w-3 h-3" /></span>
      </div>
    </Link>
  );
}
