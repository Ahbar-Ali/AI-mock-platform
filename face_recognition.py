import cv2
import numpy as np


DETECTOR_MODEL = (
    "models/"
    "face_detection_yunet_2023mar.onnx"
)

RECOGNITION_MODEL = (
    "models/"
    "face_recognition_sface_2021dec.onnx"
)


detector = cv2.FaceDetectorYN.create(
    DETECTOR_MODEL,
    "",
    (320, 320),
    0.9,
    0.3,
    5000,
)

recognizer = cv2.FaceRecognizerSF.create(
    RECOGNITION_MODEL,
    "",
)


def get_face_embedding(frame):
    if frame is None:
        raise ValueError("Invalid frame")

    height, width = frame.shape[:2]

    detector.setInputSize(
        (width, height)
    )

    _, faces = detector.detect(frame)

    if faces is None or len(faces) == 0:
        raise ValueError(
            "No face detected"
        )

    # For now, use the strongest detected face.
    face = faces[0]

    aligned_face = recognizer.alignCrop(
        frame,
        face,
    )

    embedding = recognizer.feature(
        aligned_face
    )

    embedding = embedding.flatten()

    norm = np.linalg.norm(
        embedding
    )

    if norm == 0:
        raise ValueError(
            "Invalid face embedding"
        )

    embedding = embedding / norm

    return embedding.astype(
        np.float32
    )


def cosine_similarity(
    embedding1,
    embedding2,
):
    embedding1 = np.asarray(
        embedding1,
        dtype=np.float32,
    )

    embedding2 = np.asarray(
        embedding2,
        dtype=np.float32,
    )

    denominator = (
        np.linalg.norm(embedding1)
        * np.linalg.norm(embedding2)
    )

    if denominator == 0:
        return 0.0

    return float(
        np.dot(
            embedding1,
            embedding2,
        )
        / denominator
    )