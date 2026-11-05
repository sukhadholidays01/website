export interface CustomRouteIdea { id: string; title: string; stops: readonly string[]; style: string; }
export const customRouteStyles = ["Family", "Couple", "Adventure", "Spiritual", "Heritage"] as const;
export const customRouteIdeas: readonly CustomRouteIdea[] = [
  { id: "golden-triangle", title: "Golden Triangle", stops: ["Delhi", "Agra", "Jaipur"], style: "Heritage" },
  { id: "spiritual", title: "Spiritual Circuit", stops: ["Ayodhya", "Prayagraj", "Varanasi"], style: "Spiritual" },
  { id: "rajasthan", title: "Rajasthan Escape", stops: ["Jaipur", "Jodhpur", "Udaipur"], style: "Heritage" },
  { id: "kerala", title: "Kerala Journey", stops: ["Kochi", "Munnar", "Thekkady", "Alleppey"], style: "Family" },
  { id: "goa", title: "Goa Coastal Escape", stops: ["North Goa", "South Goa"], style: "Couple" },
  { id: "himalayan", title: "Himalayan Journey", stops: ["Delhi", "Rishikesh", "Mussoorie"], style: "Adventure" },
  { id: "dubai", title: "Dubai Explorer", stops: ["Dubai", "Abu Dhabi"], style: "Family" },
];
