import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { DemoDock } from "@/components/ui/DemoDock";
import { Toast } from "@/components/ui/Toast";
import { shapeBootScript } from "@/lib/shape";
import { themeVars } from "@/lib/tenants";
import { TenantProvider } from "@/lib/tenants/client";
import { getTenant } from "@/lib/tenants/server";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-instrument",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTenant();
  const name = t.building.name;
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `Book rooms${t.fitness ? ", classes" : ""} and events at ${name}, or plan your next gathering in ${t.venues[0].name}. A Playbook prototype.`,
  };
}

export const viewport: Viewport = {
  themeColor: "#f2f0eb",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTenant();
  return (
    // The boot script may set data-shape before React hydrates. The building's accent rides on <html> so it paints first time.
    <html lang="en" className={instrument.variable} data-building={t.id} style={themeVars(t)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: shapeBootScript }} />
      </head>
      <body>
        <SmoothScroll />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <TenantProvider id={t.id}>
          <MotionRoot>
            {children}
            <Toast />
            <DemoDock />
          </MotionRoot>
        </TenantProvider>
      </body>
    </html>
  );
}
