import { describe, it, expect } from "vitest";
import { getCommands, getCommandHandlers } from "./index.js";

describe("command registry", () => {
  it("getCommands returns all 5 commands", () => {
    const commands = getCommands();
    expect(commands).toHaveLength(5);
  });

  it("getCommandHandlers returns a Map keyed by command name", () => {
    const handlers = getCommandHandlers();
    expect(handlers).toBeInstanceOf(Map);

    const names = [...handlers.keys()].sort();
    expect(names).toEqual(["docs", "help", "realm", "soul", "summon"]);
  });

  it("each command has data.name and an execute function", () => {
    const commands = getCommands();
    for (const cmd of commands) {
      expect(cmd.data.name).toBeTypeOf("string");
      expect(cmd.data.name.length).toBeGreaterThan(0);
      expect(cmd.execute).toBeTypeOf("function");
    }
  });
});
