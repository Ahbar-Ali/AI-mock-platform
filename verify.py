import os
import cv2
import numpy as np
import time
import sys
import random

from model import make_siamese_model
from preprocessing import preprocess


ANC_PATH = os.path.join("data", "anchor")

model = make_siamese_model()
model.load_weights("siamese.weights.h5")


def verify(frame, threshold=0.5):

    temp_path = "temp_input.jpg"

    cv2.imwrite(temp_path, frame)

    input_img = preprocess(temp_path)

    scores = []

    anchor_files = [
        os.path.join(ANC_PATH, file)
        for file in os.listdir(ANC_PATH)
        if file.lower().endswith(".jpg")
    ]

    anchor_files = random.sample(
        anchor_files,
        min(10, len(anchor_files))
    )

    for anchor_path in anchor_files:

        anchor_img = preprocess(anchor_path)

        prediction = model.predict(
            [
                np.expand_dims(input_img, 0),
                np.expand_dims(anchor_img, 0)
            ],
            verbose=0
        )

        score = float(prediction[0][0])

        scores.append(score)

    average_score = np.mean(scores)

    verified = average_score >= threshold

    return verified, average_score


cap = cv2.VideoCapture(
    1,
    cv2.CAP_AVFOUNDATION
)

if not cap.isOpened():
    print("Could not open camera")
    sys.exit(1)


print("Looking for your face...")
print("Press Q to cancel.")

warmup_start = time.time()
warmup_seconds = 2


last_check = 0
check_interval = 2

attempts = 0
max_attempts = 5


while True:

    ret, frame = cap.read()

    if not ret:
        continue

    frame = cv2.flip(frame, 1)

    display_frame = cv2.resize(
        frame,
        (640, 480)
    )

    current_time = time.time()

    if current_time - warmup_start < warmup_seconds:
        cv2.putText(
            display_frame,
            "Position your face...",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

        cv2.imshow("Face Verification", display_frame)

        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            sys.exit(1)

        continue

    cv2.putText(
        display_frame,
        "Verifying face...",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )

    cv2.imshow(
        "Face Verification",
        display_frame
    )

    current_time = time.time()

    if current_time - last_check >= check_interval:

        last_check = current_time

        verified, score = verify(display_frame)

        attempts += 1

        print(f"Attempt {attempts} | Score: {score:.4f}")

        if verified:
            print("FACE_VERIFIED")
            cap.release()
            cv2.destroyAllWindows()
            sys.exit(0)

        else:
            print("Face not matched yet.")

    if attempts >= max_attempts:
        print("FACE_NOT_VERIFIED")
        cap.release()
        cv2.destroyAllWindows()
        sys.exit(1)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        print("FACE_NOT_VERIFIED")
        cap.release()
        cv2.destroyAllWindows()
        sys.exit(1)