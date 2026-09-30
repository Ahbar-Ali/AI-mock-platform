import numpy as np

from superbase_client import supabase
from face_recognition import (
    get_face_embedding,
    cosine_similarity,
)


MATCH_THRESHOLD = 0.45
MATCH_MARGIN = 0.08


def load_face_profiles():
    response = (
        supabase
        .table("face_profiles")
        .select(
            """
            user_id,
            face_embedding,
            users(name)
            """
        )
        .execute()
    )

    return response.data


def find_best_match(current_embedding):
    profiles = load_face_profiles()

    if not profiles:
        return {
            "error": "NO_ENROLLED_USERS"
        }

    results = []

    for profile in profiles:
        stored_embedding = np.array(
            profile["face_embedding"],
            dtype=np.float32,
        )

        score = cosine_similarity(
            current_embedding,
            stored_embedding,
        )

        user_data = profile.get("users")

        name = (
            user_data.get("name")
            if user_data
            else "Unknown"
        )

        results.append({
            "user_id": profile["user_id"],
            "name": name,
            "score": score,
        })

        print(
            f"FACE SCORE: "
            f"{name} -> {score:.4f}"
        )

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    best = results[0]

    second_score = (
        results[1]["score"]
        if len(results) > 1
        else -1.0
    )

    margin = (
        best["score"]
        - second_score
    )

    print(
        "BEST:",
        best["name"],
        best["score"],
        "SECOND:",
        second_score,
        "MARGIN:",
        margin,
    )

    if best["score"] < MATCH_THRESHOLD:
        return None

    if (
        len(results) > 1
        and margin < MATCH_MARGIN
    ):
        return None

    return best


def verify_frame(frame):
    current_embedding = (
        get_face_embedding(frame)
    )

    match = find_best_match(
        current_embedding
    )

    if not match:
        return {
            "authenticated": False,
            "error": "FACE_NOT_RECOGNIZED",
        }

    if (
        match.get("error")
        == "NO_ENROLLED_USERS"
    ):
        return {
            "authenticated": False,
            "error": "NO_ENROLLED_USERS",
        }

    return {
        "authenticated": True,
        "user_id": match["user_id"],
        "name": match["name"],
        "score": float(
            match["score"]
        ),
    }