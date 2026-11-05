"use client";
import { QueryView } from "./query-view";
import { ShowroomAddress } from "@/components/showroom-address";
import { Enquiry } from "@/components/enquiry";
import type { SearchParams } from "@/lib/filters";
import { dealership, serviceEnquiries } from "@/lib/dealership";
function ContactView({ params }: { params: SearchParams }) {
  const selling = params.intent === "sell";
  const topic = typeof params.topic === "string" && Object.hasOwn(serviceEnquiries, params.topic) ? serviceEnquiries[params.topic as keyof typeof serviceEnquiries] : undefined;
  const message = (selling || topic) && typeof params.message === "string" ? params.message.slice(0, 1800) : topic?.message;
  return <main id="main" className={`container contact-page ${selling ? "selling-contact" : ""}`}>
    <div className="contact-page-copy">
      <p className="section-kicker">{selling ? "Sell your car" : topic?.title ?? "Contact the team"}</p>
      <h1>{selling ? <>Let’s find<br/>a fair quote.</> : "Let’s talk."}</h1>
      <p>{selling ? message ? "Your vehicle details and indicative range are ready below. Add your contact details to prepare a review enquiry." : "Tell us about your car. Contact us and we’ll help you take the next step towards a fair quote." : topic?.description ?? "For a closer look at the collection, a viewing or a question about your next car, speak with our team."}</p>
      <div className="contact-direct"><a href={dealership.telephone}>{dealership.phone}</a><a href={`mailto:${dealership.email}`}>{dealership.email}</a><span>{dealership.hours}</span></div>
      <div className="contact-pending"><span className="shoulder-rule"/><h2>{selling ? "What happens next" : "Plan your visit"}</h2><p>{selling ? "A vehicle inspection and a current market review would be needed before a final offer. This form prepares your enquiry for that conversation." : "Include the car you’re interested in and your preferred day for a viewing. You’re also welcome to visit us on Magadi Main Road."}</p><ShowroomAddress/></div>
    </div>
    <Enquiry key={`${selling ? "sell" : topic?.title ?? "general"}-${message ?? ""}`} inline intent={selling ? "sell" : undefined} initialMessage={message} subject={topic?.title}/>
  </main>;
}

export function ContactPageView() { return <QueryView>{params => <ContactView params={params}/>}</QueryView>; }
