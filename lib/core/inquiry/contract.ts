/**
 * The public inquiry contract, ported from Tenant Experience
 * (src/lib/public-venues/inquiry-contract.ts), which targets Core core-v1.json @ 7989150
 * (verified September 16, 2026). Shared by the browser form and the server route, so both
 * validate the same way. Keep it pure: no framework imports.
 */

/** The venue value for "Not sure yet". */
export const NOT_SURE = "not-sure";
/** At most this many venues in one inquiry. */
export const MAX_VENUES = 5;
/** Longest combined venue text we send to Core's free-text field (confirm Core's own limit with Matt). */
export const MAX_VENUE_TEXT = 500;

export type InquiryInput = {
  firstName: string;
  lastName: string;
  email: string;
  /** Every venue the person is considering, or [NOT_SURE] */
  venues: string[];
  /** The first of `venues`, kept for older callers */
  venue: string;
  company?: string;
  phone?: string;
  /** Required: a date, a season, or "flexible" text */
  date: string;
  /** Required: whole number of guests */
  guests: string;
  eventType?: string;
  budget?: string;
  details?: string;
  privacy: boolean;
  marketing: boolean;
  campaign?: string;
  website?: string;
  startedAt: string;
};
export type InquiryErrors = Partial<Record<keyof InquiryInput, string>>;
export type CorePublicInquiry = {
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  source_key: string;
  campaign?: string;
  booking: {
    requested_venue_text: string;
    requested_date_text?: string;
    calendar_title?: string;
    attendee_count_min?: number;
    attendee_count_max?: number;
  };
  responses: { event_type?: string; budget_range?: string; details?: string };
  consent: { privacy_policy_version: string; marketing_opt_in: boolean };
};

/** Longest accepted value per field; the form sets the same as `maxLength` */
export const LIMITS = {
  firstName: 100,
  lastName: 100,
  email: 254,
  venue: 100,
  company: 200,
  phone: 32,
  date: 500,
  guests: 6,
  eventType: 200,
  budget: 200,
  details: 4000,
  campaign: 200,
  website: 200,
  startedAt: 40,
};

export function validateInquiry(
  value: unknown,
  venueSlugs: readonly string[],
): { input: InquiryInput | null; errors: InquiryErrors } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { input: null, errors: { firstName: "Check your inquiry." } };
  const record = value as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const errors: InquiryErrors = {};
  for (const [key, limit] of Object.entries(LIMITS)) {
    const raw = record[key];
    if (raw !== undefined && typeof raw !== "string")
      errors[key as keyof InquiryInput] = "Enter a valid value.";
    fields[key] = typeof raw === "string" ? raw.trim() : "";
    if (fields[key].length > limit)
      errors[key as keyof InquiryInput] = `Use ${limit} characters or fewer.`;
  }
  for (const key of ["firstName", "lastName", "email", "date", "guests"] as const) {
    if (!fields[key]) errors[key] = "This field is required.";
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errors.email = "Enter a valid email address.";
  // Venues: a list of listed slugs, or "not sure" on its own. A single `venue` is still accepted.
  const rawVenues = Array.isArray(record.venues) ? record.venues : fields.venue ? [fields.venue] : [];
  const venues = rawVenues.filter((v): v is string => typeof v === "string").map((v) => v.trim());
  if (!venues.length) errors.venue = "Choose a venue, or “Not sure yet”.";
  else if (
    venues.length !== rawVenues.length ||
    venues.length > MAX_VENUES ||
    new Set(venues).size !== venues.length ||
    (venues.includes(NOT_SURE) && venues.length > 1) ||
    venues.some((v) => v !== NOT_SURE && !venueSlugs.includes(v))
  )
    errors.venue = "Choose listed venues.";
  if (record.privacy !== true)
    errors.privacy = "Please acknowledge the privacy policy.";
  if (typeof record.marketing !== "boolean")
    errors.marketing = "Choose your email preference.";
  if (
    fields.guests &&
    (!/^\d+$/.test(fields.guests) ||
      Number(fields.guests) < 1 ||
      Number(fields.guests) > 100000)
  )
    errors.guests = "Enter a guest count from 1 to 100,000.";
  if (!fields.startedAt || !Number.isFinite(Date.parse(fields.startedAt)))
    errors.startedAt = "Refresh the page and try again.";
  if (Object.keys(errors).length) return { input: null, errors };
  return {
    input: {
      ...fields,
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      venues,
      venue: venues[0],
      date: fields.date,
      guests: fields.guests,
      startedAt: fields.startedAt,
      privacy: true,
      marketing: record.marketing === true,
    },
    errors: {},
  };
}

/**
 * Core's `requested_venue_text` is free text, so several venues travel as their names joined
 * ("Sky Bar, Bay Lounge"). Unknown slugs are dropped; the result never exceeds MAX_VENUE_TEXT.
 */
export function venueText(slugs: readonly string[], venues: readonly { slug: string; name: string }[]): string {
  if (!slugs.length || slugs.includes(NOT_SURE)) return "Not sure yet";
  const names = slugs.map((s) => venues.find((v) => v.slug === s)?.name).filter((n): n is string => !!n);
  let text = "";
  for (const name of names) {
    const next = text ? `${text}, ${name}` : name;
    if (next.length > MAX_VENUE_TEXT) break;
    text = next;
  }
  return text || "Not sure yet";
}

export function toCoreInquiry(
  input: InquiryInput,
  venueName: string,
  config: { sourceKey: string; privacyPolicyVersion: string },
): CorePublicInquiry {
  return {
    contact: {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      ...(input.company ? { company: input.company } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    },
    source_key: config.sourceKey,
    ...(input.campaign ? { campaign: input.campaign } : {}),
    booking: {
      requested_venue_text: venueName,
      ...(input.date ? { requested_date_text: input.date } : {}),
      ...(input.eventType ? { calendar_title: input.eventType } : {}),
      ...(input.guests
        ? {
            attendee_count_min: Number(input.guests),
            attendee_count_max: Number(input.guests),
          }
        : {}),
    },
    responses: {
      ...(input.eventType ? { event_type: input.eventType } : {}),
      ...(input.budget ? { budget_range: input.budget } : {}),
      ...(input.details ? { details: input.details } : {}),
    },
    consent: {
      privacy_policy_version: config.privacyPolicyVersion,
      marketing_opt_in: input.marketing,
    },
  };
}
