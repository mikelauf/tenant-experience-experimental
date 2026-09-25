import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTenant } from "@/lib/tenants/server";
import { RoomDetail } from "@/components/member/spaces/RoomDetail";

export async function generateMetadata({ params }: PageProps<"/spaces/[slug]">) {
  const r = (await getTenant()).room((await params).slug);
  return { title: r ? `${r.name} room` : "Room" };
}

export default async function RoomPage({ params }: PageProps<"/spaces/[slug]">) {
  const { slug } = await params;
  if (!(await getTenant()).room(slug)) notFound();
  return (
    <Suspense>
      <RoomDetail slug={slug} />
    </Suspense>
  );
}
