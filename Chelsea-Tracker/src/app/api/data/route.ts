import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";
import { Action, AppData, emptyResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await readData();
  return NextResponse.json(result);
}

function ensureResponse(data: AppData, gameId: string, memberId: string) {
  if (!data.responses[gameId]) data.responses[gameId] = {};
  if (!data.responses[gameId][memberId]) {
    data.responses[gameId][memberId] = emptyResponse();
  }
  return data.responses[gameId][memberId];
}

function applyAction(data: AppData, action: Action): void {
  switch (action.type) {
    case "setInterest": {
      const r = ensureResponse(data, action.gameId, action.memberId);
      r.interest = action.interest;
      break;
    }
    case "setApplied": {
      for (const memberId of action.memberIds) {
        const r = ensureResponse(data, action.gameId, memberId);
        r.applied = action.applied;
        if (action.applied) {
          r.appliedAt = new Date().toISOString();
          if (!r.outcome) r.outcome = "pending";
        } else {
          delete r.appliedAt;
          r.outcome = null;
        }
      }
      break;
    }
    case "setOutcome": {
      for (const memberId of action.memberIds) {
        const r = ensureResponse(data, action.gameId, memberId);
        r.outcome = action.outcome;
        if (action.outcome && !r.applied) r.applied = true;
      }
      break;
    }
    case "addGame": {
      data.games.push({ ...action.game, id: crypto.randomUUID() });
      break;
    }
    case "updateGame": {
      const idx = data.games.findIndex((g) => g.id === action.game.id);
      if (idx >= 0) data.games[idx] = action.game;
      break;
    }
    case "deleteGame": {
      data.games = data.games.filter((g) => g.id !== action.gameId);
      delete data.responses[action.gameId];
      break;
    }
    case "addMember": {
      data.members.push({
        id: crypto.randomUUID(),
        name: action.name.trim(),
        membershipNumber: action.membershipNumber.trim(),
        active: true,
      });
      break;
    }
    case "updateMember": {
      const idx = data.members.findIndex((m) => m.id === action.member.id);
      if (idx >= 0) data.members[idx] = action.member;
      break;
    }
    case "updateSettings": {
      data.settings = action.settings;
      break;
    }
    case "addFeedback": {
      data.feedback.push({
        id: crypto.randomUUID(),
        authorName: action.authorName,
        text: action.text.trim(),
        createdAt: new Date().toISOString(),
        resolved: false,
      });
      break;
    }
    case "setFeedbackResolved": {
      const item = data.feedback.find((f) => f.id === action.feedbackId);
      if (item) item.resolved = action.resolved;
      break;
    }
    case "deleteFeedback": {
      data.feedback = data.feedback.filter((f) => f.id !== action.feedbackId);
      break;
    }
    case "resetSeason": {
      data.games = [];
      data.responses = {};
      data.settings.seasonLabel = action.seasonLabel;
      break;
    }
  }
}

export async function POST(req: NextRequest) {
  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!action || typeof action.type !== "string") {
    return NextResponse.json({ error: "Missing action type" }, { status: 400 });
  }
  const { data, persistent } = await readData();
  applyAction(data, action);
  data.games.sort((a, b) => a.date.localeCompare(b.date));
  await writeData(data);
  return NextResponse.json({ data, persistent });
}
