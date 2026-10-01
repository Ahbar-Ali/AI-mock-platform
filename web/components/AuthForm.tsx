"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import FaceAuthModal from "@/components/FaceAuthModal";
import { Button } from "@/components/ui/button";

interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

const AuthForm = ({ type }: AuthFormProps) => {
  const isSignIn = type === "sign-in";

  const [name, setName] = useState("");
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  return (
    <>
      <div className="card-border lg:min-w-[566px]">
        <div className="card flex flex-col gap-6 px-10 py-14">
          <div className="flex flex-row justify-center gap-2">
            <Image
              src="/logo.svg"
              alt="PrepWise"
              width={38}
              height={32}
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
              <div className="mt-4 flex flex-col items-center gap-4">
                <p className="text-center text-light-100">
                  Verify your identity using facial recognition to continue.
                </p>

                <Button
                  type="button"
                  className="btn w-full"
                  onClick={() => setFaceModalOpen(true)}
                >
                  Sign In with Face
                </Button>
              </div>

              <p className="text-center">
                No account yet?{" "}
                <Link
                  href="/sign-up"
                  className="ml-1 font-bold text-user-primary"
                >
                  Enroll Face
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name">
                    Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="input"
                  />
                </div>

                <p className="text-center text-sm text-light-100">
                  Your camera will open and capture several face samples for
                  biometric sign-in.
                </p>

                <Button
                  type="button"
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
                Already enrolled?{" "}
                <Link
                  href="/sign-in"
                  className="ml-1 font-bold text-user-primary"
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