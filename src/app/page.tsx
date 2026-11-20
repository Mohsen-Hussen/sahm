import { redirect } from "next/navigation";
import { getUserStores, requireUser } from "@/server/auth";

export default async function Home() {
  const user = await requireUser();
  const [first] = await getUserStores(user.id);
  redirect(first ? `/s/${first.slug}` : "/login");
}
