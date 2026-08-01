import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";

// หน้าแรก: ส่งต่อไป dashboard (ถ้าล็อกอิน) หรือ login
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
