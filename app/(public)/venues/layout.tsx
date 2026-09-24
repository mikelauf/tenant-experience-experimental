import { PublicNav } from "@/components/public/PublicNav";
import { Footer } from "@/components/ui/Footer";

export const metadata = {
  title: { default: "Venues & events", template: "%s · Transamerica Pyramid venues" },
  description: "Host your reception, offsite or dinner at the Transamerica Pyramid: Bay Lounge on L27, Redwood Park and Montgomery Hall.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main id="main" className="min-h-dvh">
        {children}
      </main>
      <Footer variant="public" />
    </>
  );
}
