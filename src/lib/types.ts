export type VehicleImage = {
  src: string;
  alt: string;
  label: string;
  width: number;
  height: number;
  focalPoint: string;
  kind?: "photo" | "placeholder";
  fit?: "cover" | "contain";
  credit?: { author: string; title: string; source: string; license: string; licenseUrl: string };
};
export type VehiclePrice =
  | { kind: "unknown" }
  | { kind: "on-request" }
  | { kind: "numeric"; amount: number; currency: string };
export type Vehicle = {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  body: string;
  price: VehiclePrice;
  availability?: "available" | "reserved" | "sold";
  images: VehicleImage[];
  demo: boolean;
  description?: string;
  condition?: string;
};
export type InventoryFilters = { q: string; make: string; body: string; fuel: string; year: string; maxPrice: string; sort: string };
export type ConciergeVehicle = {
  id: string; slug: string; make: string; model: string; year?: number; body: string;
  price: number; currency: string;
  image: Pick<VehicleImage, "src" | "alt" | "width" | "height">;
};
export type HeroSlide = {
  slug: string;
  name: string;
  heading: [string, string];
  description: string;
  compact: boolean;
  image: VehicleImage;
};
