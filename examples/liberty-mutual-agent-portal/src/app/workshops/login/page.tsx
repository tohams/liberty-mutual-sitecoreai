import { redirect } from "next/navigation";
import { getWorkshopSession, workshopReturnTo } from "@/server/workshops/auth";
import { WorkshopLogin } from "@/features/workshops/WorkshopLogin";
export default async function WorkshopLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = workshopReturnTo((await searchParams).returnTo);
  if (await getWorkshopSession()) redirect(returnTo);
  return <WorkshopLogin returnTo={returnTo} />;
}
