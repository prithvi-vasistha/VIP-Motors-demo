import { dealership } from "@/lib/dealership";

export function ShowroomAddress() {
  return <address><a className="address-link" href={dealership.directions} target="_blank" rel="noopener noreferrer"><span className="address-pin" aria-hidden="true">📍</span><span>{dealership.address[0]}<br/>{dealership.address[1]}</span></a></address>;
}
