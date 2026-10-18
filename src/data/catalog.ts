const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function bookingMonth(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      month: "long",
      timeZone: "America/Toronto",
    }).format(date);
  } catch {
    return MONTHS[date.getUTCMonth()] ?? "January";
  }
}

export const BUSINESS = {
  name: "Wendy's Bakehouse",
  descriptor: "Custom Cakes in Toronto & Etobicoke",
  tagline: "Made-to-order celebration cakes in Toronto.",
  phoneDisplay: "647-620-2518",
  phoneE164: "16476202518",
  whatsapp: "https://wa.me/16476202518",
  pickup: "Etobicoke, Toronto - exact address shared once your date is confirmed",
  get bookingMonth() {
    return bookingMonth();
  },
  instagram: "https://www.instagram.com/wendys.bakehouse/",
  tiktok: "https://www.tiktok.com/@wendys.bakehouse",
  threads: "https://www.threads.net/@wendys.bakehouse",
  facebook: "https://www.facebook.com/246575736114342",
} as const;

export const FAQS = [
  {
    q: "How much notice do you need?",
    a: "Please allow two weeks for a custom cake and at least three days for cupcakes. A rush custom cake under 48 hours may be available when the rush add-on is selected; the date is not held until Wendy confirms it.",
  },
  {
    q: "Where do I collect my order?",
    a: "Pickup is in Etobicoke, Toronto. The exact address is sent once your date and payment are confirmed.",
  },
  {
    q: "Do you deliver?",
    a: "Yes. Delivery is $30 in Etobicoke and $35 across the configured Greater Toronto Area postal zones. Enter your postal code at checkout to confirm that your address is covered before you pay.",
  },
  {
    q: "How do I pay and hold my date?",
    a: "Everyday items are paid in full. Custom cakes require the deposit shown when ordering, with the balance due before pickup or delivery. A booking is held only after the payment is confirmed.",
  },
  {
    q: "How are custom cake prices worked out?",
    a: "Choose the cake size and layer count, then add each design detail you want. Buttercream and fondant minimums are shown on the Pricing page and alongside your cake configuration. Every tier is a separate full three-layer cake, and the complete total is shown before checkout.",
  },
  {
    q: "Do you make fondant figures or sculpted models?",
    a: "No. Fondant covering, letters and small flat details are available, but sculpted figures and models are not offered.",
  },
  {
    q: "What should I know about allergies?",
    a: "Everything is baked in one bakery that handles wheat, dairy, egg and nuts, so cross-contact cannot be ruled out. Add allergy details at checkout and Wendy will confirm whether the order can be made safely.",
  },
] as const;
