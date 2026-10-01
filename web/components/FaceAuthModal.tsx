"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type FaceAuthModalProps = {
  open: boolean;
  mode: "login" | "enroll";
  name?: string;
  onClose: () => void;
};

const FaceAuthModal = ({
  open,
  mode,
  name,
  onClose,
}: FaceAuthModalProps) => {
  const router = useRouter();
  const videoRef =useRef<HTMLVideoElement>(null);
  const canvasRef =useRef<HTMLCanvasElement>(null);
  const streamRef =useRef<MediaStream | null>(null);
  const scanIntervalRef =useRef<ReturnType<typeof setInterval> | null>(null);
  const authenticatingRef =useRef(false);
  const enrollingRef =useRef(false);
  const [status, setStatus] =useState("Starting camera...");
  const [cameraError, setCameraError] =useState("");
  const [finished, setFinished] =useState(false);
  const livenessRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (!open) {return;}

    authenticatingRef.current = false;
    enrollingRef.current = false;

    setFinished(false);
    startCamera();

    return () => {cleanup();};
  }, [open, mode]);

  const startCamera = async () => {
    try {
      setCameraError("");
      setStatus("Starting camera...");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera access is unavailable."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      if (mode === "login") {
        setStatus(
          "Look at the camera and blink once"
        );

        startLivenessScanning();
      } else {
        setStatus(
          "Look directly at the camera"
        );

        setTimeout(() => {
          captureEnrollmentImages();
        }, 1000);
      }
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      setCameraError(
        "Could not access your camera."
      );
    }
  };

  const captureFrame = async (): Promise<Blob | null> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {return null;}

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {return null;}

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {return null;}

      ctx.save();

      ctx.translate(
        canvas.width,
        0
      );

      ctx.scale(
        -1,
        1
      );

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.restore();

      return new Promise(
        (resolve) => {
          canvas.toBlob(
            (blob) => resolve(blob),
            "image/jpeg",
            0.9
          );
        }
      );
    };

  // -------------------------
  // LOGIN
  // -------------------------

  const startLivenessScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(
        scanIntervalRef.current
      );
    }

    scanIntervalRef.current =
      setInterval(() => {
        sendFrameForLiveness();
      }, 250);
  };

  const sendFrameForLiveness = async () => {
      if (
        authenticatingRef.current ||
        livenessRequestInFlightRef.current
      ) {
        return;
      }

      const blob = await captureFrame();

      if (!blob) {
        return;
      }

      livenessRequestInFlightRef.current = true;

      try {
        const formData = new FormData();

        formData.append(
          "file",
          blob,
          "frame.jpg"
        );

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_LIVENESS_API_URL}/liveness/frame`,
          {
            method: "POST",
            body: formData,
          }
        );

        console.log(
          "LIVENESS STATUS:",
          response.status
        );

        const text = await response.text();

        console.log(
          "LIVENESS RESPONSE:",
          text
        );

        const data = JSON.parse(text);

        if (!data.face_detected) {
          setStatus(
            "Face not detected. Look at the camera."
          );
          return;
        }

        if (data.status === "eyes_closed") {
          setStatus("Blink detected...");
        }

        if (data.status === "watching") {
          setStatus(
            "Look at the camera and blink once"
          );
        }

        if (data.liveness) {
          authenticatingRef.current = true;

          if (scanIntervalRef.current) {
            clearInterval(
              scanIntervalRef.current
            );

            scanIntervalRef.current = null;
          }

          setStatus(
            "Liveness verified ✓ Verifying identity..."
          );

          await verifyFace();
        }
      } catch (error) {
        console.error(
          "Liveness error:",
          error
        );

        setStatus(
          "Could not verify liveness."
        );
      } finally {
        livenessRequestInFlightRef.current = false;
      }
    };
    
    const verifyFace = async () => {
        const blob = await captureFrame();

        if (!blob) {
            setStatus("Could not capture face.");

            authenticatingRef.current = false;

            startLivenessScanning();

            return;
        }

        try {
            const formData = new FormData();

            formData.append(
            "file",
            blob,
            "face.jpg"
            );

            const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-frame`,
            {
                method: "POST",
                body: formData,
            }
            );

            const data = await response.json();

            if (data.error === "NO_ENROLLED_USERS") {
            setStatus(
                "No enrolled users found. Please create an account first."
            );

            authenticatingRef.current = false;

            return;
            }

            if (
            !response.ok ||
            !data.authenticated
            ) {
            setStatus(
                "Face not recognized. Blink again to retry."
            );

            authenticatingRef.current = false;

            startLivenessScanning();

            return;
            }

            setFinished(true);

            setStatus(
            `Welcome, ${data.name} ✓`
            );

            const sessionResponse = await fetch(
            "/api/session",
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }
            );

            if (!sessionResponse.ok) {
            toast.error(
                "Could not create session."
            );

            return;
            }

            toast.success(
            `Welcome back, ${data.name}!`
            );

            cleanup();

            setTimeout(() => {
            router.push("/");
            router.refresh();
            }, 700);

        } catch (error) {
            console.error(
            "Face verification error:",
            error
            );

            setStatus(
            "Authentication failed. Blink again to retry."
            );

            authenticatingRef.current = false;

            startLivenessScanning();
        }
        };
  // -------------------------
  // ENROLLMENT
  // -------------------------

  const captureEnrollmentImages = async () => {
    console.log("1. captureEnrollmentImages started");

    if (enrollingRef.current) {
      return;
    }

    if (!name?.trim()) {
      setStatus("Name is required for enrollment.");
      return;
    }

    enrollingRef.current = true;

    try {
      setStatus("Capturing face images...");

      const blobs: Blob[] = [];

      for (let i = 0; i < 5; i++) {
        const blob = await captureFrame();

        if (!blob) {
          throw new Error(
            `Could not capture image ${i + 1}.`
          );
        }

        blobs.push(blob);

        setStatus(
          `Capturing face images... ${i + 1}/5`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 650)
        );
      }

      const formData = new FormData();

      blobs.forEach((blob, index) => {
        formData.append(
          "files",
          blob,
          `face-${index + 1}.jpg`
        );
      });

      const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL}/auth/enroll?name=${encodeURIComponent(
          name.trim()
        )}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log(
        "Enrollment response:",
        data
      );

      if (!response.ok || !data.success) {
        setStatus(
          data.error ||
            "Face enrollment failed."
        );

        enrollingRef.current = false;
        return;
      }

      setFinished(true);

      setStatus(
        `Enrollment complete ✓ Welcome, ${data.name}`
      );

      toast.success(
        "Face enrolled successfully!"
      );

      cleanup();

      setTimeout(() => {
        router.push("/sign-in");
        router.refresh();
      }, 1000);

    } catch (error) {
      console.error(
        "Enrollment request error:",
        error
      );

      setStatus(
        "Face enrollment failed."
      );

      enrollingRef.current = false;
    }
  };

  const cleanup = () => {
    if (
      scanIntervalRef.current
    ) {
      clearInterval(
        scanIntervalRef.current
      );

      scanIntervalRef.current =
        null;
    }

    streamRef.current
      ?.getTracks()
      .forEach(
        (track) =>
          track.stop()
      );

    streamRef.current = null;
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

      <div className="w-full max-w-lg rounded-2xl bg-dark-200 p-6 shadow-xl">

        <div className="mb-5 text-center">

          <h2 className="text-2xl font-semibold">
            {mode === "login"
              ? "Face Authentication"
              : "Face Enrollment"}
          </h2>

          <p className="mt-2 text-light-100">
            {status}
          </p>

        </div>

        <div className="overflow-hidden rounded-xl bg-black">

          {cameraError ? (

            <div className="flex min-h-[360px] items-center justify-center p-6 text-center">
              <p>
                {cameraError}
              </p>
            </div>

          ) : (

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full scale-x-[-1] object-cover"
            />

          )}

        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {!finished && (

          <Button
            className="mt-5 w-full"
            onClick={handleClose}
          >
            Cancel
          </Button>

        )}

      </div>

    </div>
  );
};

export default FaceAuthModal;