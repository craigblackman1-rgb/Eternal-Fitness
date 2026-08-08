"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialIcon from "@/components/SocialIcons";
import { useBookingModal } from "@/components/BookingModal";
import { PulseLine } from "@/components/ds";

interface BlogPostData {
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

interface Props {
  post: BlogPostData;
  relatedPosts: BlogPostData[];
  recentPosts: BlogPostData[];
  featuredPost: BlogPostData | null;
  popularPosts: BlogPostData[];
}

export default function BlogPostClient({ post, relatedPosts, recentPosts }: Props) {
  const { openBookingModal } = useBookingModal();
  const { processedContent, tocItems } = useMemo(() => {
    if (!post.content) return { processedContent: "", tocItems: [] as { id: string; text: string; level: string }[] };
    let content = post.content;
    // Drop a leading h1/h2 that just repeats the post title — the hero already shows it
    const leading = content.match(/^\s*<(h[12])[^>]*>([\s\S]*?)<\/\1>/i);
    const norm = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    if (leading && norm(leading[2]) === norm(post.title)) {
      content = content.slice(leading[0].length);
    }
    let i = 0;
    content = content.replace(/<(h[23])([^>]*)>/gi, (_match, tag, attrs) => {
      return `<${tag}${attrs} id="heading-${i++}">`;
    });
    const items: { id: string; text: string; level: string }[] = [];
    const regex = /<(h[23])[^>]*id="(heading-\d+)"[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      items.push({ id: match[2], text: match[3].replace(/<[^>]*>/g, "").trim(), level: match[1].toLowerCase() });
    }
    return { processedContent: content, tocItems: items };
  }, [post.content, post.title]);

  // Related first, topped up with recent, minus the current post, max 3
  const keepReading = useMemo(() => {
    const seen = new Set<string>([post.id]);
    const pool: BlogPostData[] = [];
    for (const p of [...relatedPosts, ...recentPosts]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        pool.push(p);
      }
    }
    return pool.slice(0, 3);
  }, [post.id, relatedPosts, recentPosts]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const getReadTime = (content: string | null) => {
    if (!content) return "5 min read";
    const text = content.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} min read`;
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://eternal-fitness.co.uk/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content">
      {/* Editorial hero — ink band, no stock photo */}
      <section className="ds-bg-ink pt-[72px]">
        <Navbar />
        <div className="max-w-[1320px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-[820px]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] uppercase mb-6">
              <Link href="/blog" className="text-white/50 hover:text-white transition-colors">Blog</Link>
              <span className="text-white/30" aria-hidden>/</span>
              <span className="text-rose">{post.category}</span>
            </nav>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-[56px] text-white leading-[1.06] tracking-[-0.03em] mb-6">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-[640px] mb-8">{post.excerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
              <span className="flex items-center gap-2">
                {post.author_avatar ? (
                  <Image src={post.author_avatar} alt={post.author_name} width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-rose/40 flex items-center justify-center text-white text-[11px] font-bold">
                    {post.author_name.charAt(0)}
                  </span>
                )}
                <span className="text-white/80 font-medium">{post.author_name}</span>
              </span>
              <span aria-hidden className="text-white/25">•</span>
              <span>{formatDate(post.published_at)}</span>
              <span aria-hidden className="text-white/25">•</span>
              <span>{getReadTime(post.content)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article */}
      <section className="ef-section px-6 md:px-12">
        <div className="max-w-[1160px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 lg:gap-20">
            <div className="min-w-0">
              {post.image_url && (
                <figure className="relative aspect-[16/9] rounded-3xl overflow-hidden mb-10 border border-[#E4DDD7]">
                  <Image src={post.image_url} alt={post.title} fill sizes="(min-width: 1024px) 860px, 100vw" className="object-cover" priority />
                </figure>
              )}

              {processedContent ? (
                <div
                  className="prose prose-lg max-w-none font-body text-foreground
                    prose-headings:font-serif prose-headings:font-normal prose-headings:text-foreground prose-headings:tracking-[-0.02em]
                    prose-h1:text-4xl prose-h1:leading-[1.1] prose-h1:mt-12 prose-h1:mb-5
                    prose-h2:text-[32px] prose-h2:leading-[1.12] prose-h2:mt-12 prose-h2:mb-5
                    prose-h3:text-2xl prose-h3:leading-[1.15] prose-h3:mt-10 prose-h3:mb-4
                    prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-3
                    prose-h5:font-body prose-h5:font-semibold prose-h5:text-base prose-h5:tracking-normal prose-h5:mt-6 prose-h5:mb-2
                    prose-h6:font-body prose-h6:font-semibold prose-h6:text-sm prose-h6:tracking-[0.08em] prose-h6:uppercase prose-h6:text-teal prose-h6:mt-6 prose-h6:mb-2
                    prose-p:font-normal prose-p:text-[#525A61] prose-p:text-[17px] prose-p:leading-[1.75] prose-p:mb-5
                    prose-a:text-rose prose-a:underline prose-a:underline-offset-4 prose-a:decoration-rose/40 hover:prose-a:decoration-rose
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-em:text-foreground/80 prose-em:italic
                    prose-ul:my-5 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2.5
                    prose-ol:my-5 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2.5
                    prose-li:font-normal prose-li:text-[#525A61] prose-li:text-[17px] prose-li:leading-[1.7] prose-li:marker:text-rose
                    prose-blockquote:font-serif prose-blockquote:not-italic prose-blockquote:text-[22px] prose-blockquote:leading-[1.4] prose-blockquote:text-foreground prose-blockquote:border-l-2 prose-blockquote:border-rose prose-blockquote:bg-transparent prose-blockquote:py-1 prose-blockquote:pl-8 prose-blockquote:pr-0 prose-blockquote:my-10
                    prose-img:rounded-2xl prose-img:my-8
                    prose-hr:border-[#E4DDD7] prose-hr:my-12"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              ) : (
                <p className="ef-body">Full content coming soon.</p>
              )}

              {/* Author strip */}
              <div className="mt-14 pt-8 border-t border-[#E4DDD7] flex flex-col sm:flex-row sm:items-center gap-5">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt={post.author_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-rose/20 flex items-center justify-center text-rose text-lg font-bold flex-shrink-0">
                    {post.author_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-foreground">{post.author_name}</p>
                  <p className="ef-body text-sm">
                    Personal trainer in Worthing, Level 4 qualified in Cancer and Exercise Rehabilitation, specialising in exercise for people with health conditions and complex needs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="inline-flex items-center gap-2 bg-rose text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto"
                >
                  Book a Free Consultation
                </button>
              </div>
            </div>

            {/* Sidebar — sticky, minimal */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-10">
                {tocItems.length > 0 && (
                  <nav aria-label="Table of contents">
                    <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-4">In this article</p>
                    <ul className="space-y-2.5 border-l border-[#E4DDD7]">
                      {tocItems.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className={`block text-sm leading-snug -ml-px border-l border-transparent pl-4 hover:border-rose hover:text-rose transition-colors ${
                              item.level === "h3" ? "text-[#525A61] pl-7" : "text-foreground font-medium"
                            }`}
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}

                <div>
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-3">Share</p>
                  <div className="flex gap-2">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="w-9 h-9 rounded-full border border-[#E4DDD7] flex items-center justify-center hover:bg-rose hover:text-white hover:border-rose transition-colors text-foreground">
                      <SocialIcon name="facebook" />
                    </a>
                    <a href={`https://wa.me/?text=${encodeURIComponent(post.title + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="w-9 h-9 rounded-full border border-[#E4DDD7] flex items-center justify-center hover:bg-rose hover:text-white hover:border-rose transition-colors text-foreground">
                      <SocialIcon name="whatsapp" />
                    </a>
                    <a href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Share via Email" className="w-9 h-9 rounded-full border border-[#E4DDD7] flex items-center justify-center hover:bg-rose hover:text-white hover:border-rose transition-colors text-foreground">
                      <SocialIcon name="email" />
                    </a>
                  </div>
                </div>

                <div className="border-t border-[#E4DDD7] pt-8">
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-3">Explore</p>
                  <ul className="space-y-2 text-sm">
                    <li><Link href="/exercise-for-health" className="text-foreground hover:text-rose transition-colors">Exercise for Health</Link></li>
                    <li><Link href="/cancer-rehabilitation" className="text-foreground hover:text-rose transition-colors">Cancer Rehabilitation</Link></li>
                    <li><Link href="/personal-training" className="text-foreground hover:text-rose transition-colors">Personal Training</Link></li>
                  </ul>
                </div>

                <div className="border-t border-[#E4DDD7] pt-8">
                  <div className="max-w-[180px] mb-4"><PulseLine accent="rose" /></div>
                  <p className="font-serif text-xl text-foreground leading-snug mb-2">Not sure where to start?</p>
                  <p className="ef-body text-sm mb-4">The first conversation is free, with no commitment.</p>
                  <button type="button" onClick={openBookingModal} className="text-[var(--rose-text)] text-sm font-semibold hover:underline underline-offset-4">
                    Book a Free Consultation →
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Keep reading */}
      {keepReading.length > 0 && (
        <section className="bg-warm ef-section px-6 md:px-12">
          <div className="max-w-[1160px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-10 gap-4">
              <h2 className="font-serif text-3xl md:text-4xl text-foreground tracking-[-0.02em]">Keep reading</h2>
              <Link href="/blog" className="text-[var(--rose-text)] text-sm font-semibold hover:underline underline-offset-4">
                View all articles →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
              {keepReading.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`} className="group border-t border-[#D8CFC7] pt-6 block">
                  <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-teal mb-3">{rp.category}</p>
                  <h3 className="font-serif text-xl text-foreground leading-snug tracking-[-0.015em] mb-3 group-hover:text-rose transition-colors">
                    {rp.title}
                  </h3>
                  {rp.excerpt && <p className="ef-body text-sm line-clamp-2 mb-3">{rp.excerpt}</p>}
                  <p className="text-xs text-[#525A61]">{formatDate(rp.published_at)} · {getReadTime(rp.content)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="ef-section px-6 md:px-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl text-foreground ef-h2 mb-4">
            Book a Personal Training Session in Worthing
          </h2>
          <p className="ef-body text-base md:text-lg mb-8">
            Want a simple plan based on your body and goals? Book a free consultation and I will map out a safe, personalised approach that feels good and fits your week.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button type="button" onClick={openBookingModal} className="inline-flex items-center gap-2 bg-rose text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
              Book a Free Consultation
            </button>
            <a href="tel:07517658128" className="inline-flex items-center gap-2 border border-[#E4DDD7] text-[#525A61] px-6 py-3 rounded-full font-medium hover:bg-rose hover:text-white transition-colors">
              Call: 07517 658 128
            </a>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
