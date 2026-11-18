export interface GoogleReview {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  date?: string;
  source: "Google";
  reviewUrl?: string;
  featured: boolean;
  order: number;
  active: boolean;
}

// Add: insert an object below using the fields above and a unique id.
// Copy the genuine reviewer name, rating and original wording exactly.
// Edit: change that review's fields. Remove: delete its whole object.
// Hide: set active to false. Show: set active to true.
// Feature: set featured to true for a highlighted card (never duplicated).
// Order: lower order numbers appear first, regardless of featured status.
// Optional: date (the original displayed date) and reviewUrl (original Google URL).
// All other fields are required. Add any number of reviews, including five or more.
export const googleReviews: GoogleReview[] = [
  {
    id: "review-001",
    name: "Som Jain",
    rating: 5,
    text: "I booked a taxi from Ayodhya to Varanasi, and the driver and car were excellent. Very good experience",
    date: "2 week ago",
    source: "Google",
    reviewUrl: "https://maps.app.goo.gl/j58Hfuvf5UHmLNnq6",
    featured: true,
    order: 1,
    active: true,
  },

  {
    id: "review-002",
    name: "Jyoti",
    rating: 5,
    text: "I booked a taxi ayodhya to varanasi best and affortable price best experieans.",
    date: "a week ago",
    source: "Google",
    reviewUrl: "https://maps.app.goo.gl/gxHYq18bdJFrASaS6",
    featured: true,
    order: 1,
    active: true,
  },
  {
    id: "review-003",
    name: "Lakshmi Narayan Pandey",
    rating: 5,
    text: "I am recently book jaisalmer tour package my experience is very good and journey was very safe overall best experience.",
    date: "a month ago",
    source: "Google",
    reviewUrl: "https://maps.app.goo.gl/zaDVBAbwcJDWEoZh6",
    featured: false,
    order: 2,
    active: true,
  },
  {
    id: "review-004",
    name: "Mantu Kumar",
    rating: 5,
    text: "I recently booked a tour package for Kashmir from Sukhad Holidays, and the experience was seamless and unforgettable",
    date: "a week ago",
    source: "Google",
    reviewUrl: "https://maps.app.goo.gl/gxHYq18bdJFrASaS6",
    featured: true,
    order: 1,
    active: true,
  },
];

// Supply only verified Business Profile values, independently of selected reviews.
// Never derive the overall Google rating or count from the reviews above.
// Set verified: true only after checking the overall rating/count on Google.
export const googleReviewProfile: {
  verified?: boolean;
  overallRating?: number;
  totalReviewCount?: number;
  businessProfileUrl?: string;
} = {
  verified: true,
  overallRating: 4.8,
  totalReviewCount: 125,
  businessProfileUrl: "YOUR_VERIFIED_GOOGLE_BUSINESS_PROFILE_URL",
};
