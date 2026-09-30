"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import FaceAuthModal from "@/components/FaceAuthModal";
import { Button } from "@/components/ui/button";

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

  const isSignIn = type === "sign-in";

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] =useState(false);
  const handleFaceSignIn = async () => {
    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
      });

    const data = await response.json();

    if (!response.ok || !data.authenticated) {
      toast.error("Face authentication failed.");
      return;
    }

    // Create the Next.js session cookie
    const sessionResponse = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!sessionResponse.ok) {
      toast.error("Could not create user session.");
      return;
    }

    toast.success(`Welcome back, ${data.name}!`);

    router.push("/");
    router.refresh();

    } catch (error) {
      console.error(error);
      toast.error("Could not connect to facial authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8000/auth/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error("Face enrollment failed.");
        return;
      }

      toast.success("Face enrolled successfully. You can now sign in.");

      router.push("/sign-in");
    } catch (error) {
      console.error(error);
      toast.error("Could not connect to facial enrollment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">

        <div className="flex flex-row gap-2 justify-center">
          <Image
            src="/logo.svg"
            alt="logo"
            height={32}
            width={38}
          />

          <h2 className="text-primary-100">
            PrepWise
          </h2>
        </div>

        <h3 className="text-center">
          Practice job interviews with AI
        </h3>

        {isSignIn ? (
          <>
            <div className="flex flex-col items-center gap-4 mt-4">
              <p className="text-center text-light-100">
                Verify your identity using facial recognition to continue.
              </p>

              <Button
                className="btn w-full"
                onClick={() => setFaceModalOpen(true)}
                disabled={loading}
              >
                Sign In with Face
              </Button>
            </div>

            <p className="text-center">
              No account yet?

              <Link
                href="/sign-up"
                className="font-bold text-user-primary ml-1"
              >
                Enroll Face
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 mt-4">

              <div className="flex flex-col gap-2">
                <label htmlFor="name">
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Your name"
                  className="input"
                />
              </div>

              <p className="text-sm text-light-100 text-center">
                Your camera will open and capture several
                face samples for biometric sign-in.
              </p>

              <Button
                className="btn w-full"
                onClick={() => {
                  if (!name.trim()) {
                    toast.error("Please enter your name.");
                    return;
                  }

                  setEnrollModalOpen(true);
                }}
              >
                Enroll Face
              </Button>
            </div>

            <p className="text-center">
              Already enrolled?

              <Link
                href="/sign-in"
                className="font-bold text-user-primary ml-1"
              >
                Sign In
              </Link>
            </p>
          </>
        )}

      </div>
    </div>

    <FaceAuthModal
      open={faceModalOpen}
      mode="login"
      onClose={() => setFaceModalOpen(false)}
    />

    <FaceAuthModal
      open={enrollModalOpen}
      mode="enroll"
      name={name}
      onClose={() => setEnrollModalOpen(false)}
    />
  </>
  
  );
  
};

export default AuthForm;