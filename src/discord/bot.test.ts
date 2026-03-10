import { describe, it, expect, vi } from "vitest";
import { getCommands, getCommandHandlers } from "./commands/index.js";

describe("bot commands", () => {
  it("registers all 5 slash commands", () => {
    const commands = getCommands();
    expect(commands).toHaveLength(5);

    const names = commands.map((c) => c.data.name);
    expect(names).toContain("realm");
    expect(names).toContain("summon");
    expect(names).toContain("soul");
    expect(names).toContain("help");
    expect(names).toContain("docs");
  });

  it("builds command handler map", () => {
    const handlers = getCommandHandlers();
    expect(handlers.size).toBe(5);
    expect(handlers.has("realm")).toBe(true);
    expect(handlers.has("summon")).toBe(true);
    expect(handlers.has("soul")).toBe(true);
    expect(handlers.has("help")).toBe(true);
    expect(handlers.has("docs")).toBe(true);
  });

  it("each command has data and execute", () => {
    for (const cmd of getCommands()) {
      expect(cmd.data).toBeDefined();
      expect(cmd.data.name).toBeTruthy();
      expect(typeof cmd.execute).toBe("function");
    }
  });
});
