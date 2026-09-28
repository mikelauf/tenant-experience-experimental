import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isDemo } from "@/lib/flags";
import { MemberTabBar, MemberTopNav } from "@/components/member/MemberNav";
import { MemberFooter } from "@/components/member/MemberFooter";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  // The member app is demo-only until it's wired to Core; production serves the public venue site alone.
  if (!isDemo) notFound();
  // Schedules and plans are relative to "now", so render at request time, not build time.
  await connection();
  return (
    <>
      <MemberTopNav />
      <main id="main" className="min-h-[60svh]">
        {children}
      </main>
      <MemberFooter />
      <MemberTabBar />
    </>
  );
}
