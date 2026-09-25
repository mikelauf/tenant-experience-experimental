import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenants/server";
import { EventDetail } from "@/components/member/programming/EventDetail";

export async function generateMetadata({ params }: PageProps<"/programming/[slug]">) {
  const e = (await getTenant()).eventBySlug((await params).slug);
  return { title: e?.name ?? "Event", description: e?.summary };
}

export default async function EventPage({ params }: PageProps<"/programming/[slug]">) {
  const { slug } = await params;
  if (!(await getTenant()).eventBySlug(slug)) notFound();
  return <EventDetail slug={slug} />;
}
