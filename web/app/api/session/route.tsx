import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await request.json();

  if (!user?.user_id || !user?.name) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set(
    "face_user",
    JSON.stringify({
      id: user.user_id,
      name: user.name,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    }
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.delete("face_user");

  return response;
}