import { inventory } from "./inventory";
import type { HeroSlide } from "./types";

// Editorial order, using only existing catalogue records and their own photographs.
const selections: { slug: string; heading: [string, string]; description: string; compact?: boolean }[] = [
  { slug: "ferrari-roma-2022", heading: ["Ferrari", "Roma"], description: "Explore the Roma, then discover the rest of the collection." },
  { slug: "bentley-continental-gt-2021", heading: ["Bentley", "Continental GT"], description: "Take a closer look at the Continental GT. A grand tourer with presence.", compact: true },
  { slug: "porsche-911-carrera-s-2021", heading: ["Porsche", "911"], description: "Discover the 911 Carrera S. An unmistakable shape, a closer look away." },
  { slug: "maybach-s580-2022", heading: ["Mercedes-Maybach", "S-Class"], description: "Explore the S-Class. Space, comfort and a quieter kind of presence.", compact: true },
  { slug: "bmw-x7-40i-2023", heading: ["BMW", "X7"], description: "Discover the X7. A spacious perspective on your next drive." },
  { slug: "range-rover-autobiography-2020", heading: ["Range Rover", "Autobiography"], description: "Explore the Range Rover Autobiography. A commanding view of the road.", compact: true },
];

export const heroSlides: HeroSlide[] = selections.flatMap(selection => {
  const vehicle = inventory.find(car => car.slug === selection.slug);
  if (!vehicle?.images[0]) return [];
  return [{ slug: vehicle.slug, name: `${vehicle.make} ${vehicle.model}`, heading: selection.heading, description: selection.description, compact: Boolean(selection.compact), image: vehicle.images[0] }];
});
