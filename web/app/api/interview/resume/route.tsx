import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { supabase } from "@/lib/supabase";
import { getRandomInterviewCover } from "@/lib/utils";

const interviewSchema = z.object({
  candidateSummary: z.string(),
  skills: z.array(z.string()),
  questions: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const {
      userId,
      role,
      resumeText,
      jobRequirements,
      interviewFocus
    } = await request.json();

    const allowedFocus = [
      "balanced",
      "technical",
      "behavioral",
    ];

    if (
      !userId ||
      !role ||
      !resumeText ||
      !jobRequirements ||
      !allowedFocus.includes(interviewFocus)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Resume, target role, and job requirements are required.",
        },
        { status: 400 }
      );
    }

    const focusInstructions =
      interviewFocus === "technical"
        ? `
    INTERVIEW FOCUS: TECHNICAL

    Prioritize:
    - technical depth
    - system design
    - architecture
    - debugging
    - tools and frameworks
    - coding concepts
    - problem-solving
    - technical decisions and tradeoffs

    Behavioral questions may appear, but technical questions should dominate.
    `
        : interviewFocus === "behavioral"
        ? `
    INTERVIEW FOCUS: BEHAVIORAL

    Prioritize:
    - teamwork
    - communication
    - ownership
    - conflict resolution
    - leadership
    - adaptability
    - failures and lessons learned
    - decision-making
    - past work experiences

    Technical context may be used, but behavioral questions should dominate.
    `
        : `
    INTERVIEW FOCUS: BALANCED

    Generate a balanced mix of:
    - technical questions
    - behavioral questions
    - resume-specific questions
    - job-specific questions
    `;

    const interviewPrompt = `
        You are an expert technical interviewer.

        TARGET ROLE:
        ${role}

        JOB REQUIREMENTS:
        ${jobRequirements}

        CANDIDATE RESUME:
        ${resumeText}

        ${focusInstructions}

        Generate exactly 5 personalized interview questions.

        Requirements:
        - Focus on this specific job posting.
        - Use the candidate's resume to personalize the questions.
        - Ask about skills, projects, and experience relevant to the job.
        - Test whether the candidate genuinely understands technologies they claim to know.
        - Explore important job requirements that are missing or weakly demonstrated on the resume.
        - Avoid generic questions when a more specific question can be asked.
        - Do not provide answers.
        - Do not invent experience that is not present in the resume.
        - Questions should sound like a realistic interviewer speaking to the candidate.

        The goal is to evaluate how well this candidate fits this specific job.
        `;

    let object;

    try {
      console.log("Trying Gemini 3.6 Flash...");

      const result = await generateObject({
        model: google("gemini-3.8-flash"),
        schema: interviewSchema,
        prompt: interviewPrompt,
      });

      object = result.object;
    } catch (primaryError) {
      console.error(
        "Gemini 3.8 Flash failed, trying fallback:",
        primaryError
      );

      const fallbackResult = await generateObject({
        model: google("gemini-3.5-flash-lite"),
        schema: interviewSchema,
        prompt: interviewPrompt,
      });

      object = fallbackResult.object;
    }

    const { data, error } =
      await supabase
        .from("interviews")
        .insert({
          user_id: userId,
          role: role.trim(),
          type: "resume",
          techstack: object.skills,
          questions: object.questions,
          finalized: true,
          cover_image:getRandomInterviewCover(),
          resume_text: resumeText,
          job_requirements:jobRequirements,
          interview_focus: interviewFocus,
        })
        .select("id")
        .single();

    if (error) {
      console.error(
        "Supabase interview error:",
        error
      );

      throw error;
    }

    return Response.json(
      {
        success: true,
        interviewId: data.id,
        questions: object.questions,
        skills: object.skills,
        candidateSummary:
          object.candidateSummary,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Resume interview generation error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not generate interview.",
      },
      {
        status: 500,
      }
    );
  }
}