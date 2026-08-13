import { randomUUID } from "node:crypto";

// Pure seeding logic — deliberately has no dependency on trips.service, so
// trips.service can call this at trip-creation time without creating an
// import cycle (trips → tracker.templates is one-way; tracker.service,
// which DOES need to look up trips, imports trips.service the other way).
//
// Note what this is not: the document items below are a generic reminder,
// not the output of a nationality/destination legal-requirements engine —
// that's the Phase 2 international documentation module (PRD §5). Calling
// this out in the copy itself rather than quietly shipping a look-alike.
export function seedCategories({ destination, vibe, days }) {
  const isIndia = destination.country === "India";

  const categories = [
    {
      key: "bookings",
      label: "Bookings",
      icon: vibe.motif,
      items: [
        item(`Flight to ${destination.name}`, "Book once your dates are fixed"),
        item(`Stay, ${Math.max(days - 1, 1)} night${days - 1 === 1 ? "" : "s"}`, "Due before your booking window closes"),
      ],
    },
    {
      key: "documents",
      label: "Documents",
      icon: vibe.cornerMotif,
      items: [
        item("Travel insurance", "Confirm before departure"),
        isIndia
          ? item("Carry a government-issued ID", "Required at most check-ins")
          : item("Check visa & entry requirements", "Full country-specific rules land in a later phase — verify with official sources for now"),
      ],
    },
    {
      key: "packing",
      label: "Packing",
      icon: vibe.motif,
      items: [item(destination.packingHint, "Pack the day before")],
    },
    {
      key: "logistics",
      label: "Logistics",
      icon: vibe.cornerMotif,
      items: isIndia
        ? [item("Cash for rural stretches", "ATMs can be sparse outside town centres")]
        : [item("Local currency or card acceptance", "Order cash or confirm your card works there"), item("Notify your bank of travel dates", "Avoids blocked international transactions")],
    },
  ];

  return { categories };
}

function item(label, due) {
  return { id: randomUUID(), label, due, done: false, assignee: null };
}
