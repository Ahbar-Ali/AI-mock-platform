import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const WelcomePage = () => {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="min-h-screen flex flex-col px-6 md:px-12">
        {/* Navbar */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="PrepWise"
              width={40}
              height={40}
              priority
            />

            <h2 className="text-2xl font-bold">
              PrepWise
            </h2>
          </div>

          <Button
            asChild
            className="rounded-full px-6 py-5 font-semibold"
          >
            <Link href="/sign-in">
              Sign In
            </Link>
          </Button>
        </nav>

        {/* Hero */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-6 text-sm md:text-base font-semibold tracking-wide text-primary-200">
            AI INTERVIEW PREPARATION
          </p>

          <h1 className="max-w-5xl text-5xl md:text-7xl font-bold leading-tight">
            Practice smarter. Walk into interviews prepared.
          </h1>

          <p className="mt-6 max-w-2xl text-base md:text-xl leading-relaxed text-light-100">
            Upload your resume and job description, practice with an AI
            interviewer, and receive personalized feedback on your performance.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              asChild
              className="btn-primary min-w-[160px] rounded-full px-8 py-6 text-base font-semibold"
            >
              <Link href="/sign-in">
                Get Started
              </Link>
            </Button>

            <Button
              asChild
              className="btn-secondary min-w-[160px] rounded-full px-8 py-6 text-base font-semibold"
            >
              <Link href="/sign-up">
                Create Account
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-4 pb-10 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">
              Resume-Aware Interviews
            </h3>

            <p className="mt-2 text-sm text-light-100">
              Practice questions tailored to your resume and target role.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">
              AI Voice Interviewer
            </h3>

            <p className="mt-2 text-sm text-light-100">
              Simulate a real interview with an interactive AI interviewer.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold">
              Personalized Feedback
            </h3>

            <p className="mt-2 text-sm text-light-100">
              Review your strengths, weaknesses, transcript, and interview score.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default WelcomePage;