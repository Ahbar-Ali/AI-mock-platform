from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from face_recognition import authenticate


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Face authentication API is running"
    }


@app.post("/auth/login")
def login():
    user = authenticate()

    if not user:
        return {
            "authenticated": False
        }

    return {
        "authenticated": True,
        "user_id": user["user_id"],
        "name": user["name"],
        "score": user["score"],
    }