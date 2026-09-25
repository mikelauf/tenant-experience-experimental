import { FitnessHome } from "@/components/member/fitness/FitnessHome";
import { getTenant } from "@/lib/tenants/server";

export async function generateMetadata() {
  return { title: (await getTenant()).fitness?.name ?? "Fitness" };
}

export default function FitnessPage() {
  return <FitnessHome />;
}
