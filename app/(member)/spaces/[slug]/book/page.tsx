import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTenant } from "@/lib/tenants/server";
import { BookReview } from "@/components/member/spaces/BookReview";

export const metadata = { title: "Review booking" };

export default async function BookPage({ params }: PageProps<"/spaces/[slug]/book">) {
  const { slug } = await params;
  if (!(await getTenant()).room(slug)) notFound();
  return (
    <Suspense>
      <BookReview slug={slug} />
    </Suspense>
  );
}
