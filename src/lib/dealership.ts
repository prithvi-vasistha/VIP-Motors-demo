// Business details supplied by VIP Motors. Keep shared contact destinations here.
export const dealership = {
  name: "VIP Motors",
  address: ["Magadi Main Road, opp. Shell petrol bunk", "Rajajinagar, Bengaluru, Karnataka"],
  phone: "+91 97318 61111",
  telephone: "tel:+919731861111",
  email: "vipmotorsindia@yahoo.com",
  hours: "Open daily, 10:00 am to 8:30 pm",
  directions: "https://www.google.com/maps/place/VIP+Motors+Bengaluru/data=!4m2!3m1!1s0x3bae3d00274a8247:0xb702134b5bddbe2?sa=X&ved=1t:242&ictx=111",
  instagram: "https://www.instagram.com/vipmotors.india?obrf=aTRxbmpzamgyeDZ2",
  handle: "@vipmotors.india",
  description: "Curating Bengaluru’s finest pre-owned luxury cars. Every car is inspected, history-checked and ready to drive away, with finance, insurance and warranty arranged in-house.",
};

export const serviceEnquiries = {
  "insurance": {
    title: "Insurance enquiry",
    description: "Discuss cover, insured value, deductibles and insurance options for your chosen car with our team.",
    message: "I’d like to discuss insurance for a car from your collection.\nVehicle: \nCover preference: ",
  },
  "finance-insurance": {
    title: "Finance and insurance",
    description: "Speak to our team about finance and insurance for your next car. We’ll help you understand the options available for your chosen vehicle.",
    message: "I’d like to discuss finance and insurance for a car from your collection.\nVehicle: \nPreferred time to call: ",
  },
  "extended-warranty": {
    title: "Extended warranty",
    description: "Ask our team about extended warranty options, cover and eligibility for your chosen car.",
    message: "I’d like to know about extended warranty options for my chosen car.\nVehicle: \nPreferred time to call: ",
  },
} as const;
