import { NotHere } from "@/components/member/NotHere";
import type { Services } from "./types";
import { getTenant } from "./server";

const names: Record<keyof Services, string> = { spaces: "meeting rooms", fitness: "a fitness club", programming: "building events" };

/** Layout body for a service's route segment: the pages, or a friendly dead end when this building doesn't have it. */
export async function ServiceGate({ service, children }: { service: keyof Services; children: React.ReactNode }) {
  const t = await getTenant();
  const on = t.building.services[service] && (service !== "fitness" || !!t.fitness);
  return on ? children : <NotHere service={names[service]} building={t.building.name} />;
}
