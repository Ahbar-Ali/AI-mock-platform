"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/session", {
      method: "DELETE",
    });

    router.push("/");
    router.refresh();
  };

  return (
    <Button
      onClick={handleLogout}
      className="btn-secondary"
    >
      Logout
    </Button>
  );
};

export default LogoutButton;