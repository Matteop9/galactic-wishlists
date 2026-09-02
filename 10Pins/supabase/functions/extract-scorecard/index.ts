/**
 * extract-scorecard — read a lane-monitor photo into a scorecard (spec §6).
 *
 * Deliberately thin. It authenticates the caller, enforces the daily cap,
 * fetches the photo with the service role, asks the vision model for JSON,
 * and normalises the roll notation to the string form the `frames` table
 * stores (["X"], ["9","/"], ["F","3"]). It does NOT score or reconcile.
 *
 * Why not reconcile here, when spec §6.3 puts `badFrames` in the response?
 * Because that would mean a second copy of the scoring engine — one in
 * `src/engine`, one bundled into Deno — and two engines that can disagree is
 * exactly the bug this app cannot afford. The client already owns the engine
 * that scores every other entry path, so it computes `badFrames` (and the
 * verification status) from this response with `reconciles()`. Same amber
 * frames, one engine.
 *
 * The model key is never held here: it lives in this project's Vault, read
 * per-call through `public.get_secret` (service_role-only), the same secret
 * The Acca uses. The model id itself comes from `tenpins.vision_config`, so
 * it can be swapped without a redeploy.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You read ten-pin bowling scorecards from photographs of lane monitors.

Reply with STRICT JSON only — no prose, no markdown, no code fences. Schema:
{
  "players": [
    {
      "displayed_name": "MATT",
      "frames": [{"frame": 1, "rolls": ["9", "/"], "cumulative": 20}],
      "final_score": 169
    }
  ],
  "partial": false,
  "confidence_notes": "optional free text on unreadable regions"
}

Rules:
- One entry per player row on the monitor, in the order they appear top to bottom.
- "displayed_name" is exactly the text on the monitor (usually short caps). Do not expand or correct it.
- Rolls use monitor notation: "X" strike, "/" spare, "F" foul, "-" a miss (no pins), otherwise the digit knocked down.
- Frames 1-9 have at most two rolls; frame 10 has up to three.
- "cumulative" is the running total printed in that frame's box. Use null if the box is blank or you cannot read it — NEVER guess a number.
- Include only frames that have actually been bowled. Set "partial": true if the game is unfinished or any row is cut off.
- "final_score" is the printed total for that player, or null if not shown.
- If the photo is not a bowling scorecard at all, reply {"players": [], "partial": false, "confidence_notes": "not a scorecard"}.
- Read the numbers that are printed. Do not correct arithmetic that looks wrong — a wrong-looking total is information the app needs.`;

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Monitor notation → the roll tokens the frames table stores. */
function normaliseRoll(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toUpperCase();
  if (s === '') return null;
  if (s === 'X' || s === '10') return 'X';
  if (s === '/' || s === 'SPARE') return '/';
  if (s === 'F' || s === 'FOUL') return 'F';
  if (s === '-' || s === '–' || s === '—' || s === 'MISS' || s === 'O' || s === 'G') return '0';
  if (/^[0-9]$/.test(s)) return s;
  return null; // unreadable token: drop it, the frame will fail to reconcile and go amber
}

function intOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 300 ? n : null;
}

interface CleanFrame {
  frame: number;
  rolls: string[];
  cumulative: number | null;
}

interface CleanPlayer {
  displayed_name: string;
  frames: CleanFrame[];
  final_score: number | null;
}

/** Trust nothing about the shape: the model is a stranger. */
function cleanExtraction(raw: unknown): { players: CleanPlayer[]; partial: boolean; notes: string | null } {
  const obj = (raw ?? {}) as Json;
  const rawPlayers = Array.isArray(obj.players) ? obj.players : [];
  const players: CleanPlayer[] = [];

  for (const entry of rawPlayers.slice(0, 8)) {
    const p = (entry ?? {}) as Json;
    const name = String(p.displayed_name ?? '').trim().slice(0, 40);
    const rawFrames = Array.isArray(p.frames) ? p.frames : [];
    const frames: CleanFrame[] = [];

    for (const frameEntry of rawFrames) {
      const f = (frameEntry ?? {}) as Json;
      const no = Number(f.frame);
      if (!Number.isInteger(no) || no < 1 || no > 10) continue;
      const rolls = (Array.isArray(f.rolls) ? f.rolls : [])
        .map(normaliseRoll)
        .filter((r): r is string => r !== null)
        .slice(0, no === 10 ? 3 : 2);
      frames.push({ frame: no, rolls, cumulative: intOrNull(f.cumulative) });
    }

    frames.sort((a, b) => a.frame - b.frame);
    if (!name && frames.length === 0) continue;
    players.push({
      displayed_name: name || 'PLAYER',
      frames,
      final_score: intOrNull(p.final_score),
    });
  }

  const notes = typeof obj.confidence_notes === 'string' ? obj.confidence_notes.slice(0, 500) : null;
  return { players, partial: obj.partial === true, notes };
}

/** The model sometimes fences its JSON however firmly you ask it not to. */
function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('model did not return JSON');
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Who is asking. The anon client + the caller's own JWT, so a forged
  // profile id in the body is impossible — we only ever use this id.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'unauthorised' }, 401);
  const profileId = userData.user.id;

  let body: { photoPath?: string; playerCount?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request', detail: 'body must be JSON' }, 400);
  }
  const photoPath = String(body.photoPath ?? '');
  // The bucket policy already scopes writes to the caller's folder; check it
  // here too so the service-role download can't be pointed somewhere else.
  if (!photoPath || !photoPath.startsWith(`${profileId}/`)) {
    return json({ error: 'bad_request', detail: 'photoPath must be your own upload' }, 400);
  }

  const admin = createClient(url, serviceKey);
  const tp = admin.schema('tenpins');

  const { data: config, error: configErr } = await tp
    .from('vision_config')
    .select('model, max_tokens, daily_cap, enabled')
    .eq('job', 'extract_scorecard')
    .single();
  if (configErr || !config) return json({ error: 'not_configured' }, 500);
  if (!config.enabled) return json({ error: 'scanning_paused' }, 503);

  const { data: used, error: capErr } = await tp.rpc('scans_today', { p_profile: profileId });
  if (capErr) return json({ error: 'server_error', detail: 'cap check failed' }, 500);
  if ((used ?? 0) >= config.daily_cap) {
    return json({ error: 'daily_cap', detail: `${config.daily_cap} scans in 24 hours`, used }, 429);
  }

  const { data: file, error: downloadErr } = await admin.storage.from('scorecards').download(photoPath);
  if (downloadErr || !file) return json({ error: 'photo_missing' }, 404);

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${btoa(binary)}`;

  const { data: apiKey, error: keyErr } = await admin.rpc('get_secret', { p_name: 'OPENROUTER_API_KEY' });
  if (keyErr || !apiKey) return json({ error: 'not_configured', detail: 'no model key' }, 500);

  const hint = body.playerCount
    ? `The monitor should show ${body.playerCount} player rows.`
    : 'Read every player row you can see.';

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://10pins.vercel.app',
        'X-Title': '10 Pins',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: 0,
        usage: { include: true },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: hint },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    await tp.from('scan_events').insert({
      profile_id: profileId, ok: false, model: config.model, note: `network: ${String(err).slice(0, 200)}`,
    });
    return json({ error: 'model_unreachable' }, 502);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    await tp.from('scan_events').insert({
      profile_id: profileId, ok: false, model: config.model, note: `http ${response.status}: ${detail}`,
    });
    return json({ error: 'model_failed', status: response.status }, 502);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? '';
  const usage = payload?.usage ?? {};

  let extraction;
  try {
    extraction = cleanExtraction(parseModelJson(String(content)));
  } catch (err) {
    await tp.from('scan_events').insert({
      profile_id: profileId, ok: false, model: config.model,
      prompt_tokens: usage.prompt_tokens ?? null, completion_tokens: usage.completion_tokens ?? null,
      cost_usd: usage.cost ?? null, note: `unparsable: ${String(err).slice(0, 200)}`,
    });
    return json({ error: 'unreadable' }, 422);
  }

  await tp.from('scan_events').insert({
    profile_id: profileId,
    ok: extraction.players.length > 0,
    model: config.model,
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    cost_usd: usage.cost ?? null,
    note: extraction.players.length === 0 ? (extraction.notes ?? 'no players read') : null,
  });

  if (extraction.players.length === 0) {
    return json({ error: 'unreadable', detail: extraction.notes ?? null }, 422);
  }

  return json({
    players: extraction.players,
    partial: extraction.partial,
    confidence_notes: extraction.notes,
    model: config.model,
    scans_used: (used ?? 0) + 1,
    daily_cap: config.daily_cap,
  });
});
