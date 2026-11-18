import { CustomerAccountPage } from "@/components/auth/CustomerAccountPage";

export const metadata = { title: "Sign in | Sukhad Holidays",robots:{index:false,follow:false} };
export default function LoginPage() { return <CustomerAccountPage mode="login"/>; }
