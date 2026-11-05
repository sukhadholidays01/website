import { permanentRedirect } from "next/navigation";

export default function TaxiRedirectPage() {
  permanentRedirect("/cabs");
}
