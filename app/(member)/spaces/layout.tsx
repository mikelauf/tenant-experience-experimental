import { ServiceGate } from "@/lib/tenants/gate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServiceGate service="spaces">{children}</ServiceGate>;
}
