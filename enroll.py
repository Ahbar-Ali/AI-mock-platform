import numpy as np

from superbase_client import supabase
from face_recognition import get_face_embedding


NUM_IMAGES = 5


def create_user(name):
    response = (
        supabase
        .table("users")
        .insert({
            "name": name
        })
        .execute()
    )

    return response.data[0]


def save_face_profile(
    user_id,
    embedding
):
    (
        supabase
        .table("face_profiles")
        .insert({
            "user_id": user_id,
            "face_embedding":
                embedding.tolist()
        })
        .execute()
    )


def enroll_from_frames(
    name,
    frames
):
    if not name.strip():
        return {
            "success": False,
            "error":
                "Name cannot be empty."
        }

    if not frames:
        return {
            "success": False,
            "error":
                "No face images received."
        }

    user = None

    try:
        user = create_user(
            name.strip()
        )

        embeddings = []

        for frame in frames:
            embedding = (
                get_face_embedding(
                    frame
                )
            )

            embeddings.append(
                embedding
            )

        average_embedding = np.mean(
            embeddings,
            axis=0
        )

        # Normalize averaged embedding
        norm = np.linalg.norm(
            average_embedding
        )

        if norm == 0:
            raise ValueError(
                "Invalid face embedding."
            )

        average_embedding = (
            average_embedding / norm
        )

        save_face_profile(
            user["id"],
            average_embedding
        )

        return {
            "success": True,
            "user_id":
                user["id"],
            "name":
                user["name"],
        }

    except Exception as error:
        print(
            "Enrollment error:",
            error
        )

        if user:
            (
                supabase
                .table("users")
                .delete()
                .eq(
                    "id",
                    user["id"]
                )
                .execute()
            )

        return {
            "success": False,
            "error": str(error),
        }