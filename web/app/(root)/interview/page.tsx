import { redirect } from "next/navigation";

import ResumeInterviewSetup from "@/components/Resume";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  return (
    <ResumeInterviewSetup
      userId={user.id}
    />
  );
};

export default Page;