from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from enroll import enroll_from_frames
import cv2
import numpy as np
from login import verify_frame
from pypdf import PdfReader
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Face authentication API is running"}

# New browser-camera login
@app.post("/auth/verify-frame")
async def verify_face_frame(file: UploadFile = File(...)):
    contents = await file.read()

    image_array = np.frombuffer(
        contents,
        dtype=np.uint8
    )

    frame = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if frame is None:
        return {
            "authenticated": False,
            "error": "Invalid image"
        }

    result = verify_frame(frame)
    return result

@app.post("/auth/enroll")
async def enroll_user(
    name: str,
    files: List[UploadFile] = File(...)
):
    frames = []

    for file in files:
        contents = await file.read()
        image_array = np.frombuffer(
            contents,
            dtype=np.uint8
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is not None:
            frames.append(frame)

    if len(frames) < 5:
        return {
            "success": False,
            "error": "Five valid face images are required."
        }

    result = enroll_from_frames(name,frames)
    return result

@app.post("/resume/extract")
async def extract_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        return {
            "success": False,
            "error": "Only PDF resumes are supported."
        }

    try:
        contents = await file.read()
        reader = PdfReader(
            io.BytesIO(contents)
        )
        text = ""

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        text = text.strip()

        if not text:
            return {
                "success": False,
                "error": (
                    "No readable text was found in this PDF. "
                    "Please upload a text-based resume PDF rather than a scanned/image PDF."
                )
            }

        return {
            "success": True,
            "text": text,
            "pages": len(reader.pages)
        }

    except Exception as error:
        print(
            "Resume extraction error:",
            error
        )

        return {
            "success": False,
            "error": "Failed to process resume."
        }