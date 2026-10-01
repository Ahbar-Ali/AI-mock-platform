"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ResumeInterviewSetupProps = {
  userId: string;
};

const ResumeInterviewSetup = ({
  userId,
}: ResumeInterviewSetupProps) => {
  const router = useRouter();

  const [resume, setResume] =useState<File | null>(null);
  const [role, setRole] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] =useState("");

  const [interviewFocus, setInterviewFocus] =
    useState<"balanced" | "technical" | "behavioral">(
      "balanced"
    );

  const handleGenerateInterview =
  async () => {
     if (loading) {
        return;
      }
    if (!resume) {
        setStatus("Please upload your resume.");
        return;
    }

    if (!role.trim()) {
        setStatus("Please enter a target role.");
        return;
    }

    if (!jobRequirements.trim()) {
        setStatus("Please enter the job requirements or job description.");
        return;
    }


   
    try {
      setLoading(true);

      setStatus(
        "Reading your resume..."
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        resume
      );

      // STEP 1 — PDF → text
      const response =
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/resume/extract`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setStatus(
          data.error ||
            "Could not read resume."
        );

        return;
      }

      // STEP 2 — Resume + role → Gemini
      setStatus(
        "Analyzing your resume and generating personalized questions..."
      );

      const generateResponse =
        await fetch(
          "/api/interview/resume",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId,
                role:role.trim(),
                resumeText:data.text,
                jobRequirements: jobRequirements.trim(),
                interviewFocus,
              }),
          }
        );

      const interviewData =
        await generateResponse.json();

      if (
        !generateResponse.ok ||
        !interviewData.success
      ) {
        setStatus(
          interviewData.error ||
            "Could not generate interview."
        );

        return;
      }

      setStatus(
        "Interview generated successfully!"
      );

      router.push(
        `/interview/${interviewData.interviewId}`
      );

    } catch (error) {
      console.error(
        error
      );

      setStatus(
        "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

 return (
    <section className="flex flex-col gap-6">
        <div>
        <h1>Create Your Interview</h1>

        <p className="text-light-100 mt-2">
            Upload your resume and job description to generate a personalized
            interview tailored to your experience and target role.
        </p>
        </div>

        <div className="interview-form-card">
        <div className="interview-form-group">
            <label className="interview-label">
            Resume PDF
            </label>

            <input
            type="file"
            accept="application/pdf"
            onChange={(e) =>
                setResume(e.target.files?.[0] ?? null)
            }
            className="interview-file-input"
            />
        </div>

        <div className="interview-form-group">
            <label className="interview-label">
            Target Role
            </label>

            <input
            type="text"
            value={role}
            onChange={(e) =>
                setRole(e.target.value)
            }
            placeholder="e.g. Software Engineer"
            className="interview-input"
            />

            <p className="interview-help">
            Enter the role you want to practice for.
            Questions will be tailored to both this role
            and your resume.
            </p>
        </div>

        <div className="interview-form-group">
            <label className="interview-label">
            Job Requirements
            </label>

            <textarea
            value={jobRequirements}
            onChange={(e) =>
                setJobRequirements(e.target.value)
            }
            placeholder="Paste the job requirements or job description..."
            className="interview-textarea"
            />

            <p className="interview-help">
            Paste the job posting so the interview can
            focus on the exact skills and requirements
            employers are looking for.
            </p>
        </div>

        <div className="interview-form-group">
          <label className="interview-label">
            Interview Focus
          </label>

          <div className="flex gap-3 flex-wrap">
            {[
              {
                value: "balanced",
                label: "Balanced",
              },
              {
                value: "technical",
                label: "Technical",
              },
              {
                value: "behavioral",
                label: "Behavioral",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setInterviewFocus(
                    option.value as
                      | "balanced"
                      | "technical"
                      | "behavioral"
                  )
                }
                className={`interview-focus-btn ${
                  interviewFocus === option.value
                    ? "interview-focus-btn-active"
                    : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="interview-help">
            Choose whether you want a balanced interview,
            a more technical interview, or a behavioral-focused one.
          </p>
        </div>

        <button
        onClick={handleGenerateInterview}
        disabled={loading}
        className="generate-interview-btn"
      >
        {loading
          ? "Generating Interview..."
          : "Generate Interview"}
      </button>
        </div>
    </section>
    );
};

export default ResumeInterviewSetup;