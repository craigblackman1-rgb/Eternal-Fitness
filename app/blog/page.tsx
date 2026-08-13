import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import BlogPageClient from "./BlogPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Health Conditions & Cancer Recovery Blog",
  description: "Articles on training with health conditions, cancer rehabilitation, adaptive fitness and moving well at any ability. Written by Esther Fair, Level 4 qualified in Cancer and Exercise Rehabilitation.",
  alternates: { canonical: "https://eternal-fitness.co.uk/blog" },
};

export default async function BlogPage() {
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) console.error("[blog]", error.message);

  return <BlogPageClient posts={posts ?? []} />;
}
