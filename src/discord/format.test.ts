import { describe, it, expect } from "vitest";
import { splitMessage, truncateForEmbed, codeBlock, DISCORD_MAX_LENGTH } from "./format.js";

describe("splitMessage", () => {
  it("returns short text as single-element array", () => {
    const result = splitMessage("Hello world");
    expect(result).toEqual(["Hello world"]);
  });

  it("splits at paragraph boundary (\\n\\n)", () => {
    const first = "A".repeat(1200);
    const second = "B".repeat(1200);
    const text = `${first}\n\n${second}`;
    const result = splitMessage(text);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });

  it("splits at newline when no paragraph boundary is viable", () => {
    // Build text where \n\n only exists too early (< 30%), but \n exists at a good spot
    const first = "A".repeat(1500);
    const second = "B".repeat(1500);
    const text = `${first}\n${second}`;
    const result = splitMessage(text);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });

  it("splits at space when no newline boundary is viable", () => {
    const first = "A".repeat(1500);
    const second = "B".repeat(1500);
    const text = `${first} ${second}`;
    const result = splitMessage(text);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });

  it("hard splits when no whitespace is available", () => {
    const text = "A".repeat(3000);
    const result = splitMessage(text);

    expect(result.length).toBe(2);
    expect(result[0]).toBe("A".repeat(DISCORD_MAX_LENGTH));
    expect(result[1]).toBe("A".repeat(3000 - DISCORD_MAX_LENGTH));
  });
});

describe("truncateForEmbed", () => {
  it("returns short text unchanged", () => {
    const text = "Hello world";
    expect(truncateForEmbed(text)).toBe(text);
  });

  it("truncates long text and appends ellipsis", () => {
    const text = "A".repeat(5000);
    const result = truncateForEmbed(text);

    expect(result.length).toBe(4096);
    expect(result.endsWith("...")).toBe(true);
    expect(result).toBe("A".repeat(4093) + "...");
  });
});

describe("codeBlock", () => {
  it("wraps text with triple backticks and language tag", () => {
    const result = codeBlock("const x = 1;", "ts");
    expect(result).toBe("```ts\nconst x = 1;\n```");
  });

  it("wraps text with triple backticks and no language tag", () => {
    const result = codeBlock("hello");
    expect(result).toBe("```\nhello\n```");
  });
});
