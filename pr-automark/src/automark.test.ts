import { describe, expect, test } from "bun:test"
import { isRepoEnabled, pickFilesToMark } from "./automark"
import type { FileEntry } from "./github"

const pr = { owner: "leanscaper", repo: "mobile-app", number: 1265 }

describe("isRepoEnabled", () => {
	test("needs an enabled rule matching the repo", () => {
		expect(isRepoEnabled([{ value: "leanscaper/mobile-app", enabled: true }], pr)).toBe(true)
		expect(isRepoEnabled([{ value: "leanscaper/*", enabled: true }], pr)).toBe(true)
		expect(isRepoEnabled([{ value: "leanscaper/mobile-app", enabled: false }], pr)).toBe(false)
		expect(isRepoEnabled([{ value: "pvinis/arogos", enabled: true }], pr)).toBe(false)
		expect(isRepoEnabled([], pr)).toBe(false)
	})
})

describe("pickFilesToMark", () => {
	const file = (path: string, viewed = false) =>
		({ path, viewed, button: {} as HTMLButtonElement }) satisfies FileEntry
	const patterns = ["*.tests.tsx", "*.stories.tsx"]

	test("picks matching files that aren't viewed yet", () => {
		const files = [
			file("src/BottomNav.tests.tsx"),
			file("src/BottomNav.tsx"),
			file("src/FilterChip.stories.tsx"),
			file("src/NavHeader.tests.tsx", true),
		]

		expect(pickFilesToMark(files, patterns, new Set())).toEqual([
			"src/BottomNav.tests.tsx",
			"src/FilterChip.stories.tsx",
		])
	})

	test("leaves a file alone once handled, so un-marking it by hand sticks", () => {
		const seen = new Set<string>()
		pickFilesToMark([file("src/BottomNav.tests.tsx"), file("src/NavHeader.tests.tsx", true)], patterns, seen)

		const afterUnmarking = [file("src/BottomNav.tests.tsx"), file("src/NavHeader.tests.tsx")]
		expect(pickFilesToMark(afterUnmarking, patterns, seen)).toEqual([])
	})

	test("still picks up files for a pattern enabled later", () => {
		const seen = new Set<string>()
		pickFilesToMark([file("src/recentItems.tests.ts")], patterns, seen)

		expect(pickFilesToMark([file("src/recentItems.tests.ts")], ["*.tests.ts"], seen)).toEqual([
			"src/recentItems.tests.ts",
		])
	})

	test("picks each file once, even if GitHub renders it twice", () => {
		const files = [file("src/BottomNav.tests.tsx"), file("src/BottomNav.tests.tsx")]
		expect(pickFilesToMark(files, patterns, new Set())).toEqual(["src/BottomNav.tests.tsx"])
	})
})
