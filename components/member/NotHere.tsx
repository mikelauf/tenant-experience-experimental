import { ButtonLink } from "@/components/ui/Button";

/** Shown when a route belongs to a service this building doesn't offer. */
export function NotHere({ service, building }: { service: string; building: string }) {
  return (
    <div className="frame flex min-h-[80svh] flex-col justify-center pb-tab pt-[calc(var(--nav-h)+48px)]">
      <p className="t-meta">Not at this building</p>
      <h1 className="t-hero mt-3 max-w-[16ch]">
        {building} doesn&apos;t offer {service}.
      </h1>
      <p className="t-lead mt-5 max-w-[46ch] text-stone">
        Every Playbook building has its own mix of services. The concierge can point you to the closest alternative.
      </p>
      <div className="mt-8">
        <ButtonLink href="/" icon="arrow-right">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
