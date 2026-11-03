import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { compactHistory, stripNoise } from "./history";

const tool = (name: string, output: unknown, state = "output-available") =>
  ({ type: `tool-${name}`, toolCallId: "c" + Math.random(), state, input: {}, output }) as unknown as UIMessage["parts"][number];
const msg = (role: "user" | "assistant", parts: UIMessage["parts"], id = Math.random().toString()): UIMessage => ({ id, role, parts });

describe("compactHistory", () => {
  it("strips reasoning/custom/step-start parts", () => {
    const parts = [{ type: "step-start" }, { type: "reasoning", text: "" }, { type: "custom" }, { type: "text", text: "hi" }] as unknown as UIMessage["parts"];
    expect(stripNoise(parts).map((p) => p.type)).toEqual(["text"]);
  });

  it("omits older read-only tool outputs but keeps recent ones", () => {
    const old = msg("assistant", [tool("get_programme", { big: "x".repeat(5000) })]);
    const recent = msg("assistant", [tool("get_programme", { big: "y" })]);
    const out = compactHistory([old, msg("user", [{ type: "text", text: "a" }]), recent], { keepFull: 2 });
    expect((out[0].parts[0] as { output: { omitted?: string } }).output.omitted).toBeTruthy();
    expect((out[2].parts[0] as { output: { big: string } }).output.big).toBe("y");
  });

  it("truncates big write-tool outputs outside the fresh window", () => {
    const old = msg("assistant", [tool("start_workout", { plan: "z".repeat(3000) })]);
    const out = compactHistory([old, msg("user", [{ type: "text", text: "a" }]), msg("assistant", [{ type: "text", text: "b" }])], { keepFull: 1, maxToolChars: 100 });
    const o = (out[0].parts[0] as { output: { truncated: boolean; preview: string } }).output;
    expect(o.truncated).toBe(true);
    expect(o.preview.length).toBe(100);
  });

  it("closes dangling tool calls so the provider accepts the turn", () => {
    const m = msg("assistant", [tool("log_set", undefined, "input-available")]);
    const out = compactHistory([m]);
    const p = out[0].parts[0] as { state: string; output: { error: string } };
    expect(p.state).toBe("output-available");
    expect(p.output.error).toMatch(/No result/);
  });

  it("drops the oldest messages once over budget", () => {
    const ms = Array.from({ length: 10 }, (_, i) => msg(i % 2 ? "assistant" : "user", [{ type: "text", text: "m".repeat(100) }], String(i)));
    const out = compactHistory(ms, { budgetChars: 350 });
    expect(out.map((m) => m.id)).toEqual(["7", "8", "9"]);
  });

  it("drops assistant messages that become empty", () => {
    const m = msg("assistant", [{ type: "reasoning", text: "" }] as unknown as UIMessage["parts"]);
    expect(compactHistory([m, msg("user", [{ type: "text", text: "x" }])])).toHaveLength(1);
  });
});
