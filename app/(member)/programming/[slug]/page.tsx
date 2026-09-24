import { notFound } from "next/navigation";
import { eventBySlug } from "@/lib/data/events";
import { EventDetail } from "@/components/member/programming/EventDetail";

export async function generateMetadata({ params }: PageProps<"/programming/[slug]">) {
  const e = eventBySlug((await params).slug);
  return { title: e?.name ?? "Event", description: e?.summary };
}

export default async function EventPage({ params }: PageProps<"/programming/[slug]">) {
  const { slug } = await params;
  if (!eventBySlug(slug)) notFound();
  return <EventDetail slug={slug} />;
}
