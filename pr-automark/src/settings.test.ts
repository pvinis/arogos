import { describe, expect, test } from "bun:test"
import { DEFAULT_SETTINGS, parsePatternInput, parseRepoInput } from "./settings"

test("defaults cover the leanscaper/mobile-app test and story files", () => {
	expect(DEFAULT_SETTINGS).toEqual({
		patterns: [
			{ value: "*.tests.tsx", enabled: true },
			{ value: "*.tests.ts", enabled: true },
			{ value: "*.stories.tsx", enabled: true },
		],
		repos: [{ value: "leanscaper/mobile-app", enabled: true }],
	})
})

describe("parseRepoInput", () => {
	test("accepts owner/repo and owner/*", () => {
		expect(parseRepoInput("leanscaper/mobile-app")).toBe("leanscaper/mobile-app")
		expect(parseRepoInput("  leanscaper/*  ")).toBe("leanscaper/*")
		expect(parseRepoInput("some.org/repo_name.js")).toBe("some.org/repo_name.js")
	})

	test("accepts a pasted GitHub link", () => {
		expect(parseRepoInput("https://github.com/leanscaper/mobile-app/pull/1265/changes")).toBe(
			"leanscaper/mobile-app",
		)
		expect(parseRepoInput("github.com/leanscaper/mobile-app")).toBe("leanscaper/mobile-app")
		expect(parseRepoInput("leanscaper/mobile-app/")).toBe("leanscaper/mobile-app")
	})

	test("rejects anything else", () => {
		expect(parseRepoInput("")).toBeNull()
		expect(parseRepoInput("leanscaper")).toBeNull()
		expect(parseRepoInput("lean scaper/mobile-app")).toBeNull()
		expect(parseRepoInput("https://gitlab.com/leanscaper/mobile-app")).toBeNull()
	})
})

test("parsePatternInput trims, and rejects empty input", () => {
	expect(parsePatternInput("  *.snap ")).toBe("*.snap")
	expect(parsePatternInput("   ")).toBeNull()
})
