import { connection } from "next/server";
import { MemberTabBar, MemberTopNav } from "@/components/member/MemberNav";
import { Footer } from "@/components/ui/Footer";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  // Schedules and plans are relative to "now", so render at request time, not build time.
  await connection();
  return (
    <>
      <MemberTopNav />
      <main id="main" className="min-h-dvh">
        {children}
      </main>
      <Footer variant="member" />
      <MemberTabBar />
    </>
  );
}
