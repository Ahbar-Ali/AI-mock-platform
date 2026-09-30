"use server";

import { cookies } from "next/headers";


export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const session = cookieStore.get("face_user")?.value;

  if (!session) {
    return null;
  }

  try {
    const user = JSON.parse(session);

    return {
      id: user.id,
      name: user.name,
    } as User;
  } catch {
    return null;
  }
}


export async function isAuthenticated() {
  const user = await getCurrentUser();

  return !!user;
}


export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("face_user");
}