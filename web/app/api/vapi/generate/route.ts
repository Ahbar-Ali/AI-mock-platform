import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { supabase } from "@/lib/supabase";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const {
    type,
    role,
    level,
    techstack,
    amount,
    userid,
  } = await request.json();

  try {
    const { text: questions } = await generateText({
      model: google("gemini-3.8-flash"),
      prompt: `
        Prepare questions for a job interview.

        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.

        Please return only the questions without additional text.

        The questions will be read by a voice assistant, so do not use
        "/", "*", or other special characters that may break the voice assistant.

        Return the questions exactly like:

        ["Question 1", "Question 2", "Question 3"]
      `,
    });

    const parsedQuestions = JSON.parse(questions);

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(",").map(
        (tech: string) => tech.trim()
      ),
      questions: parsedQuestions,
      user_id: userid,
      finalized: true,
      cover_image: getRandomInterviewCover(),
    };

    const { data, error } = await supabase
      .from("interviews")
      .insert(interview)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        success: true,
        interview: data,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error generating interview:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return Response.json(
    {
      success: true,
      data: "Interview API is running",
    },
    {
      status: 200,
    }
  );
}