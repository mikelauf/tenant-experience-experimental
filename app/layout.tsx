import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { DemoDock } from "@/components/ui/DemoDock";
import { Toast } from "@/components/ui/Toast";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Transamerica Pyramid", template: "%s · Transamerica Pyramid" },
  description: "Book rooms, classes and events at the Transamerica Pyramid, or plan your next gathering in the Bay Lounge. A Playbook prototype.",
};

export const viewport: Viewport = {
  themeColor: "#f2f0eb",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={instrument.variable}>
      <body>
        <SmoothScroll />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <MotionRoot>
          {children}
          <Toast />
          <DemoDock />
        </MotionRoot>
      </body>
    </html>
  );
}
