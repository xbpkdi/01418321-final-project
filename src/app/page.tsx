import { redirect } from "next/navigation";

// root ของ site map คือหน้า Login (rubric ข้อ 29)
export default function Home() {
  redirect("/login");
}
