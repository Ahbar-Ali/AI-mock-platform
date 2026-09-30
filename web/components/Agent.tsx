"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesRef = useRef<SavedMessage[]>([]);
  const feedbackStartedRef = useRef(false);
  const partialTranscriptRef = useRef<SavedMessage | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const exitingInterviewRef = useRef(false);
  

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = async () => {
      console.log("CALL ENDED");

      setCallStatus(CallStatus.FINISHED);
      setLiveTranscript("");

      if (exitingInterviewRef.current) {
        router.push("/");
        return;
      }

      if (feedbackStartedRef.current) {
        return;
      }

      feedbackStartedRef.current = true;

     
      await new Promise((resolve) =>
        setTimeout(resolve, 1500)
      );

      if (partialTranscriptRef.current) {
        messagesRef.current = [
          ...messagesRef.current,
          partialTranscriptRef.current,
        ];

        partialTranscriptRef.current = null;
      }

      const transcript = messagesRef.current;

      console.log("FINAL TRANSCRIPT:", transcript);
      console.log("INTERVIEW ID:", interviewId);
      console.log("USER ID:", userId);

      if (!interviewId || !userId) {
        console.error(
          "Missing interviewId or userId"
        );

        toast.error(
          "Could not generate feedback: interview information is missing."
        );

        feedbackStartedRef.current = false;
        return;
      }

      if (transcript.length === 0) {
        console.error(
          "No transcript was collected"
        );

        toast.error(
          "No transcript was captured, so feedback could not be generated."
        );

        feedbackStartedRef.current = false;
        return;
      }

      try {
        toast.loading(
          "Generating interview feedback...",
          {
            id: "feedback",
          }
        );

        const result =
          await createFeedback({
            interviewId,
            userId,
            transcript,
            feedbackId,
          });

        console.log(
          "FEEDBACK RESULT:",
          result
        );

        if (
          result?.success &&
          result.feedbackId
        ) {
          toast.success(
            "Feedback generated!",
            {
              id: "feedback",
            }
          );

          router.push(
            `/interview/${interviewId}/feedback`
          );

          return;
        }

        toast.error(
          "Feedback generation failed.",
          {
            id: "feedback",
          }
        );

        feedbackStartedRef.current = false;

      } catch (error) {
        console.error(
          "FEEDBACK GENERATION ERROR:",
          error
        );

        toast.error(
          "Could not generate feedback.",
          {
            id: "feedback",
          }
        );

        feedbackStartedRef.current = false;
      }
    };

    const onMessage = (message: Message) => {
      console.log("VAPI MESSAGE:", message);

      if (message.type !== "transcript") {
        return;
      }

      const currentMessage: SavedMessage = {
        role: message.role,
        content: message.transcript,
      };

      setLiveTranscript(message.transcript);

      if (message.transcriptType === "partial") {
        partialTranscriptRef.current = currentMessage;
      }

      if (message.transcriptType === "final") {
        partialTranscriptRef.current = null;

        messagesRef.current = [
          ...messagesRef.current,
          currentMessage,
        ];

        setMessages(messagesRef.current);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: any) => {
      console.error("VAPI ERROR:", error);

      console.error(
        "VAPI ERROR DETAILS:",
        JSON.stringify(error, null, 2)
      );

      if (error?.message) {
        console.error(
          "VAPI ERROR MESSAGE:",
          error.message
        );
      }

      if (error?.errorMsg) {
        console.error(
          "VAPI ERROR MSG:",
          error.errorMsg
        );
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);


  const handleCall = async () => {
    messagesRef.current = [];
    partialTranscriptRef.current = null;
    feedbackStartedRef.current = false;
    exitingInterviewRef.current = false;

    setMessages([]);
    setCallStatus(CallStatus.CONNECTING);
    setLiveTranscript("");

    if (type === "generate") {
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
        variableValues: {
          username: userName,
          userid: userId,
        },
      });
    } else {
      let formattedQuestions = "";

      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
          username: userName,
        },
      });
    }
  };

  const handleDisconnect = () => {
    vapi.stop();
  };

  const handleBack = () => {
    if (callStatus === CallStatus.ACTIVE) {
      const confirmed = window.confirm(
        "End this interview and return to the dashboard? Your current interview will not generate feedback."
      );

      if (!confirmed) {
        return;
      }

      exitingInterviewRef.current = true;
      vapi.stop();
      return;
    }

    router.push("/");
  };

  return (
    <>
    <button
      onClick={handleBack}
      className="mb-4 text-light-100 hover:text-white transition-colors self-start"
    >
      ← Back to Dashboard
    </button>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {liveTranscript && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={liveTranscript}
              className="animate-fadeIn"
            >
              {liveTranscript}
            </p>
          </div>
        </div>
      )}
 
      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
