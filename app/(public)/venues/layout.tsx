import { PublicNav } from "@/components/public/PublicNav";
import { Shortlist } from "@/components/public/Shortlist";
import { Footer } from "@/components/ui/Footer";
import { getTenant } from "@/lib/tenants/server";

export async function generateMetadata() {
  const t = await getTenant();
  return {
    title: { default: "Venues & events", template: `%s · ${t.building.name} venues` },
    description: t.copy.public.description,
  };
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main id="main" className="min-h-dvh">
        {children}
      </main>
      <Footer variant="public" />
      <Shortlist />
    </>
  );
}
