"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { coachMemory } from "@/db/schema";
import { clearSessionCookie, isAuthed } from "@/lib/auth";

export async function forgetMemory(id: number) {
  if (!(await isAuthed())) throw new Error("Unauthorised");
  await db.delete(coachMemory).where(eq(coachMemory.id, id));
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
