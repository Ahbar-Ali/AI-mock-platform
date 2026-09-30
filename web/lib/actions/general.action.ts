"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { supabase } from "@/lib/supabase";
import { feedbackSchema } from "@/constants";


export async function createFeedback(params: CreateFeedbackParams) {
  const {
    interviewId,
    userId,
    transcript,
    feedbackId,
  } = params;

  try {
    console.log("CREATE FEEDBACK STARTED");
    console.log("Interview ID:", interviewId);
    console.log("User ID:", userId);
    console.log("Transcript:", transcript);

    if (!interviewId || !userId) {
      console.error("Missing interviewId or userId");

      return {
        success: false,
        feedbackId: null,
      };
    }

    if (!transcript || transcript.length === 0) {
      console.error("Transcript is empty");

      return {
        success: false,
        feedbackId: null,
      };
    }

    const formattedTranscript = transcript
      .map(
        (message: {
          role: string;
          content: string;
        }) =>
          `${message.role}: ${message.content}`
      )
      .join("\n");

    console.log(
      "FORMATTED TRANSCRIPT:",
      formattedTranscript
    );

    let text: string;

    const { data: interviewData, error: interviewError } =
        await supabase
          .from("interviews")
          .select("role, job_requirements, resume_text")
          .eq("id", interviewId)
          .eq("user_id", userId)
          .single();

      if (interviewError || !interviewData) {
        console.error(
          "Could not load interview context:",
          interviewError
        );

        return {
          success: false,
          feedbackId: null,
        };
      }

      const targetRole = interviewData.role ?? "";
      const jobRequirements = interviewData.job_requirements ?? "";
      const resumeText = interviewData.resume_text ?? "";

        try {
          console.log("Generating feedback with primary Gemini model...");

          const result = await generateText({
            model: google("gemini-3.8-flash"),

            system: `
              You are a professional technical interviewer evaluating
              a candidate after a mock interview.

              Return ONLY valid JSON.
              Do not use markdown.
              Do not wrap the JSON in triple backticks.
            `,
              prompt: `
              Evaluate this mock interview.

              TARGET ROLE:
              ${targetRole}

              JOB REQUIREMENTS:
              ${jobRequirements}

              CANDIDATE RESUME:
              ${resumeText}

              INTERVIEW TRANSCRIPT:
              ${formattedTranscript}

              Return ONLY valid JSON.

              Use EXACTLY this structure:

              {
                "totalScore": 75,
                "categoryScores": [
                  {
                    "name": "Communication Skills",
                    "score": 75,
                    "comment": "Brief explanation"
                  },
                  {
                    "name": "Technical Knowledge",
                    "score": 75,
                    "comment": "Brief explanation"
                  },
                  {
                    "name": "Problem-Solving",
                    "score": 75,
                    "comment": "Brief explanation"
                  },
                  {
                    "name": "Cultural & Role Fit",
                    "score": 75,
                    "comment": "Brief explanation"
                  },
                  {
                    "name": "Confidence & Clarity",
                    "score": 75,
                    "comment": "Brief explanation"
                  }
                ],
                "strengths": [
                  "Strength 1",
                  "Strength 2"
                ],
                "areasForImprovement": [
                  "Improvement 1",
                  "Improvement 2"
                ],
                "finalAssessment": "Overall assessment"
              }

              Rules:
              - Use the key "name", NOT "categoryName".
              - Every category MUST include "name", "score", and "comment".
              - All scores MUST be between 0 and 100.
              - Return exactly 5 categoryScores.
              - Do not use markdown.
              - Do not include anything outside the JSON object.
              `,
                });

              text = result.text;

          } catch (primaryError) {
            console.error(
              "Primary feedback model failed, trying fallback:",
              primaryError
            );

            const fallbackResult = await generateText({
              model: google("gemini-3.5-flash-lite"),

              system: `
                You are a professional technical interviewer evaluating
                a candidate after a mock interview.

                Return ONLY valid JSON.
                Do not use markdown.
                Do not wrap the JSON in triple backticks.
              `,

              prompt: `
                Evaluate this mock interview.

                TARGET ROLE:
                ${targetRole}

                JOB REQUIREMENTS:
                ${jobRequirements}

                CANDIDATE RESUME:
                ${resumeText}

                INTERVIEW TRANSCRIPT:
                ${formattedTranscript}

                Evaluate the candidate based on:
                - how well their answers match the job requirements
                - whether they demonstrated the required technical skills
                - whether their resume experience was supported by their answers
                - communication quality
                - problem-solving ability
                - confidence and clarity
                - overall fit for this specific role

                Important:
                - Do not invent experience or skills.
                - If a required skill was not demonstrated, mention that clearly.
                - If the candidate demonstrated something strongly related to the job requirements, mention it as a strength.

                Return ONLY valid JSON.

                Use EXACTLY this structure:

                {
                  "totalScore": 75,
                  "categoryScores": [
                    {
                      "name": "Communication Skills",
                      "score": 75,
                      "comment": "Brief explanation"
                    },
                    {
                      "name": "Technical Knowledge",
                      "score": 75,
                      "comment": "Brief explanation"
                    },
                    {
                      "name": "Problem-Solving",
                      "score": 75,
                      "comment": "Brief explanation"
                    },
                    {
                      "name": "Cultural & Role Fit",
                      "score": 75,
                      "comment": "Brief explanation"
                    },
                    {
                      "name": "Confidence & Clarity",
                      "score": 75,
                      "comment": "Brief explanation"
                    }
                  ],
                  "strengths": [
                    "Strength 1",
                    "Strength 2"
                  ],
                  "areasForImprovement": [
                    "Improvement 1",
                    "Improvement 2"
                  ],
                  "finalAssessment": "Overall assessment"
                }

                Rules:
                - Use the key "name", NOT "categoryName".
                - Every category MUST include "name", "score", and "comment".
                - All scores MUST be between 0 and 100.
                - Return exactly 5 categoryScores.
                - Do not use markdown.
                - Do not include anything outside the JSON object.
                `
            });

            text = fallbackResult.text;
          }

          console.log("RAW GEMINI FEEDBACK:", text);

            let cleanedText = text.trim();

            if (cleanedText.startsWith("```json")) {
              cleanedText = cleanedText
                .replace(/^```json/, "")
                .replace(/```$/, "")
                .trim();
            } else if (cleanedText.startsWith("```")) {
              cleanedText = cleanedText
                .replace(/^```/, "")
                .replace(/```$/, "")
                .trim();
            }

            const parsedJson = JSON.parse(cleanedText);

            if (Array.isArray(parsedJson.categoryScores)) {
              parsedJson.categoryScores =
                parsedJson.categoryScores.map(
                  (category: any) => ({
                    name:
                      category.name ??
                      category.categoryName ??
                      "Unknown",

                    score:
                      category.score <= 10
                        ? category.score * 10
                        : category.score,

                    comment:
                      category.comment ??
                      "No detailed comment was provided.",
                  })
                );
            }

            const validation =
              feedbackSchema.safeParse(parsedJson);

            if (!validation.success) {
              console.error(
                "FEEDBACK VALIDATION ERROR:",
                validation.error
              );

              return {
                success: false,
                feedbackId: null,
              };
            }

            const object = validation.data;

            console.log(
              "VALIDATED FEEDBACK:",
              object
            );

        console.log(
          "GEMINI FEEDBACK OBJECT:",
          object
        );

    const feedbackData = {
      interview_id: interviewId,
      user_id: userId,
      total_score: object.totalScore,
      category_scores:
        object.categoryScores,
      strengths: object.strengths,
      areas_for_improvement:
        object.areasForImprovement,
      final_assessment:
        object.finalAssessment,
    };

    console.log(
      "FEEDBACK DATA:",
      feedbackData
    );

    if (feedbackId) {
      const { error } = await supabase
        .from("feedback")
        .update(feedbackData)
        .eq("id", feedbackId);

      if (error) {
        console.error(
          "SUPABASE UPDATE ERROR:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        return {
          success: false,
          feedbackId: null,
        };
      }

      return {
        success: true,
        feedbackId,
      };
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert(feedbackData)
      .select("id")
      .single();

    if (error) {
      console.error(
        "SUPABASE INSERT ERROR:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      );

      return {
        success: false,
        feedbackId: null,
      };
    }

    console.log(
      "FEEDBACK SAVED:",
      data
    );

    return {
      success: true,
      feedbackId: data.id,
    };
  } catch (error) {
    console.error(
      "CREATE FEEDBACK ERROR:",
      error
    );

    return {
      success: false,
      feedbackId: null,
    };
  }
}


export async function getInterviewById(
  id: string,
  userId: string
): Promise<Interview | null> {
  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    role: data.role,
    type: data.type,
    techstack: data.techstack ?? [],
    questions: data.questions ?? [],
    finalized: data.finalized,
    createdAt: data.created_at,
  } as Interview;
}


export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("interview_id", interviewId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    interviewId: data.interview_id,
    userId: data.user_id,
    totalScore: data.total_score,
    categoryScores: data.category_scores ?? [],
    strengths: data.strengths ?? [],
    areasForImprovement: data.areas_for_improvement ?? [],
    finalAssessment: data.final_assessment,
    createdAt: data.created_at,
  } as Feedback;
}


export async function getLatestInterviews(
    params: GetLatestInterviewsParams
  ): Promise<Interview[] | null> {
    const { userId, limit = 20 } = params;

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("finalized", true)
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error("LATEST INTERVIEWS ERROR:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return [];
    }

    return data.map((interview) => ({
      id: interview.id,
      userId: interview.user_id,
      role: interview.role,
      type: interview.type,
      techstack: interview.techstack ?? [],
      questions: interview.questions ?? [],
      finalized: interview.finalized,
      createdAt: interview.created_at,
    })) as Interview[];
  }


export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  console.log("GET INTERVIEWS USER ID:", userId);

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("USER INTERVIEWS ERROR:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    return [];
  }

  return data.map((interview) => ({
    id: interview.id,
    userId: interview.user_id,
    role: interview.role,
    type: interview.type,
    techstack: interview.techstack ?? [],
    questions: interview.questions ?? [],
    finalized: interview.finalized,
    createdAt: interview.created_at,
  })) as Interview[];
}