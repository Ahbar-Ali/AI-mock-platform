
import cv2
import numpy as np
import mediapipe as mp

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ai-mock-platform-henna.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


MODEL_PATH = "models/face_landmarker.task"


options = FaceLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1,
    output_face_blendshapes=True,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)


landmarker = FaceLandmarker.create_from_options(
    options
)


blink_threshold = 0.30
open_threshold = 0.20

eyes_were_closed = False

@app.get("/")
def root():
    return {
        "message": "Liveness API is running"
    }


@app.post("/liveness/frame")
async def check_liveness(
    file: UploadFile = File(...)
):
    global eyes_were_closed

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
            "face_detected": False,
            "liveness": False
        }

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    result = landmarker.detect(
        mp_image,
    )

    if not result.face_blendshapes:
        return {
            "face_detected": False,
            "liveness": False
        }

    blendshapes = (
        result.face_blendshapes[0]
    )

    blink_left = 0.0
    blink_right = 0.0

    for shape in blendshapes:

        if (
            shape.category_name
            == "eyeBlinkLeft"
        ):
            blink_left = shape.score

        elif (
            shape.category_name
            == "eyeBlinkRight"
        ):
            blink_right = shape.score

    average_blink = (
        blink_left + blink_right
    ) / 2

    if average_blink > blink_threshold:

        eyes_were_closed = True

        return {
            "face_detected": True,
            "liveness": False,
            "status": "eyes_closed",
            "blink_score": average_blink,
        }

    if (
        eyes_were_closed
        and average_blink < open_threshold
    ):

        eyes_were_closed = False

        return {
            "face_detected": True,
            "liveness": True,
            "status": "blink_detected",
            "blink_score": average_blink,
        }

    return {
        "face_detected": True,
        "liveness": False,
        "status": "watching",
        "blink_score": average_blink,
    }