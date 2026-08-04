import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cleanMetaDescription } from "@/lib/seo";
import BlogPostClient from "./BlogPostClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  updated_at: string;
  is_featured: boolean;
}

async function getPost(slug: string): Promise<BlogPostData | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}

async function getAllPosts(): Promise<BlogPostData[]> {
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });
  return data ?? [];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: "Post Not Found — Eternal Fitness Blog", robots: { index: false, follow: false } };
  }
  const description = post.excerpt
    ? cleanMetaDescription(post.excerpt)
    : `Read ${post.title} on the Eternal Fitness blog. Personal training insights from Esther Fair, Level 4 qualified in Cancer and Exercise Rehabilitation, in Worthing.`;
  return {
    title: post.title,
    description,
    alternates: { canonical: `https://eternal-fitness.co.uk/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author_name],
      images: post.image_url ? [{ url: post.image_url }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, allPosts] = await Promise.all([getPost(params.slug), getAllPosts()]);

  if (!post) notFound();

  // Get related posts from the same category/cluster
  const relatedPosts = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  const recentPosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 4);
  const featuredPost = allPosts.find((p) => p.is_featured && p.slug !== post.slug) ?? null;
  const popularPosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ? cleanMetaDescription(post.excerpt) : "",
    image: post.image_url || "https://eternal-fitness.co.uk/og-image.png",
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      "@type": "Person",
      name: post.author_name === "Esther Fair" || post.author_name?.includes("Esther") ? "Esther Fair" : post.author_name,
      url: "https://eternal-fitness.co.uk/about",
      worksFor: {
        "@type": "LocalBusiness",
        name: "Eternal Fitness",
        "@id": "https://eternal-fitness.co.uk/#business"
      }
    },
    publisher: {
      "@type": "Organization",
      name: "Eternal Fitness",
      url: "https://eternal-fitness.co.uk",
      logo: { "@type": "ImageObject", url: "https://eternal-fitness.co.uk/og-image.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://eternal-fitness.co.uk/blog/${post.slug}` },
    articleSection: post.category,
    keywords: `${post.category}, personal training Worthing, fitness, health`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <BlogPostClient post={post} relatedPosts={relatedPosts} recentPosts={recentPosts} featuredPost={featuredPost} popularPosts={popularPosts} />
    </>
  );
}
