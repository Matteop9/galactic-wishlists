import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatClient from "./chat-client";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const { data: plan } = await supabase
    .from("daily_plans")
    .select("morning_conversation,final_plan")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (!plan?.morning_conversation) {
    redirect("/app/checkin/morning");
  }

  return (
    <ChatClient
      initialMessages={plan.morning_conversation as { role: "user" | "assistant"; content: string }[]}
      finalPlan={plan.final_plan ?? null}
      date={today}
    />
  );
}
