"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { ArrowUpRight, Star } from "lucide-react";
import { googleReviews, googleReviewProfile, type GoogleReview } from "@/data/google-reviews";
import { SectionReveal } from "@/components/motion/TravelMotion";
import s from "./MarketplaceHome.module.css";

// Omit placeholders and non-Google links without changing manually entered data.
function googleUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "google.com" || url.hostname.endsWith(".google.com") || url.hostname === "maps.app.goo.gl" || url.hostname === "g.page") ? url.href : undefined;
  } catch { return undefined; }
}

function ReviewCard({ review, index }: { review: GoogleReview; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotionPreference();
  const long = review.text.length > 280;
  const textId = `google-review-${review.id}`;
  const reviewUrl = googleUrl(review.reviewUrl);
  return <motion.article className={`${s.reviewCard} ${review.featured ? s.reviewFeatured : ""}`}
    initial={reduced ? false : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    whileHover={reduced ? undefined : { y: -5, transition: { duration: 0.2, delay: 0 } }}
    transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : Math.min(index, 4) * 0.07, ease: "easeOut" }}>
    <div className={s.reviewTop}><h3>{review.name}</h3><span>{review.source}</span></div>
    <div className={s.reviewStars} role="img" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map(star => <Star key={star} size={16} aria-hidden="true" fill={star <= review.rating ? "currentColor" : "none"}/>)}</div>
    <p id={textId} className={s.reviewText}>{long && !expanded ? `${review.text.slice(0,280)}…` : review.text}</p>
    {long && <button type="button" className={s.reviewToggle} aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded(!expanded)}>{expanded ? "Read less" : "Read more"}</button>}
    <div className={s.reviewBottom}>{review.date && <span>{review.date}</span>}{reviewUrl && <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className={s.textLink}>Read on Google <ArrowUpRight size={15}/></a>}</div>
  </motion.article>;
}

export function GoogleReviews() {
  const reviews = googleReviews.filter(review => review.active === true).sort((a,b) => a.order - b.order);
  if (!reviews.length) return null;
  const profile = googleReviewProfile;
  const profileUrl = googleUrl(profile.businessProfileUrl);
  return <SectionReveal><section className={`${s.section} ${s.reviews}`} aria-labelledby="reviews-heading"><div className={s.container}>
    <div className={s.sectionTop}><div><p className={s.eyebrow}>CUSTOMER REVIEWS · GOOGLE</p><h2 id="reviews-heading" className={s.heading}>Stories from our travellers</h2><p className={s.copy}>Every journey means something. Here&apos;s what our travellers say about their experiences.</p></div>
      <div className={s.reviewSummary}>{profile.verified === true && profile.overallRating !== undefined && <p><Star size={17} aria-hidden="true"/> {profile.overallRating} / 5 on Google</p>}{profile.verified === true && profile.totalReviewCount !== undefined && <p>{profile.totalReviewCount.toLocaleString("en-IN")} Google reviews</p>}{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className={s.textLink}>View all Google reviews <ArrowUpRight size={16}/></a>}</div>
    </div>
    <div className={s.reviewGrid}>{reviews.map((review, index) => <ReviewCard key={review.id} review={review} index={index}/>)}</div>
    {/* <p className={s.reviewDisclosure}>Selected customer reviews from Google, manually managed by Sukhad Holidays.</p> */}
  </div></section></SectionReveal>;
}
