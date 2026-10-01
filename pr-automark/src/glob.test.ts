import { describe, expect, test } from "bun:test"
import { matchesFilePattern, matchesRepoPattern } from "./glob"

describe("matchesFilePattern", () => {
	test("a pattern without a slash matches the file name in any folder", () => {
		expect(matchesFilePattern("src/components/BottomNav.tests.tsx", "*.tests.tsx")).toBe(true)
		expect(matchesFilePattern("BottomNav.tests.tsx", "*.tests.tsx")).toBe(true)
		expect(matchesFilePattern("src/components/FilterChip.stories.tsx", "*.stories.tsx")).toBe(true)
	})

	test("does not match similar names", () => {
		expect(matchesFilePattern("src/components/BottomNav.tsx", "*.tests.tsx")).toBe(false)
		expect(matchesFilePattern("src/navDestinations.tests.ts", "*.tests.tsx")).toBe(false)
		expect(matchesFilePattern("src/BottomNav.tests.tsx.snap", "*.tests.tsx")).toBe(false)
		expect(matchesFilePattern("src/components/BottomNavXtests.tsx", "*.tests.tsx")).toBe(false)
	})

	test("a pattern with a slash matches the full path", () => {
		expect(matchesFilePattern(".changes/20260912-revised-tab-bar.yml", ".changes/*.yml")).toBe(true)
		expect(matchesFilePattern("old/.changes/x.yml", ".changes/*.yml")).toBe(false)
		expect(matchesFilePattern("/.changes/x.yml", ".changes/*.yml")).toBe(false)
		expect(matchesFilePattern(".changes/x.yml", "/.changes/*.yml")).toBe(true)
	})

	test("* and ? stay within one folder, ** crosses folders", () => {
		expect(matchesFilePattern("src/a/b/c.gen.ts", "src/*.gen.ts")).toBe(false)
		expect(matchesFilePattern("src/a/b/c.gen.ts", "src/**/*.gen.ts")).toBe(true)
		expect(matchesFilePattern("src/c.gen.ts", "src/**/*.gen.ts")).toBe(true)
		expect(matchesFilePattern("src/a/snapshot", "src/**")).toBe(true)
		expect(matchesFilePattern("v1.ts", "v?.ts")).toBe(true)
		expect(matchesFilePattern("v12.ts", "v?.ts")).toBe(false)
	})

	test("regex characters in a pattern are literal", () => {
		expect(matchesFilePattern("src/app/(tabs)/_layout.tsx", "src/app/(tabs)/*")).toBe(true)
		expect(matchesFilePattern("a+b.ts", "a+b.ts")).toBe(true)
		expect(matchesFilePattern("aab.ts", "a+b.ts")).toBe(false)
	})

	test("is case sensitive, like git", () => {
		expect(matchesFilePattern("Foo.TESTS.tsx", "*.tests.tsx")).toBe(false)
	})

	test("a path shortened by GitHub still matches file name patterns", () => {
		expect(matchesFilePattern("…/components/BottomNav.tests.tsx", "*.tests.tsx")).toBe(true)
	})
})

describe("matchesRepoPattern", () => {
	test("matches owner/repo, ignoring case", () => {
		expect(matchesRepoPattern("leanscaper/mobile-app", "leanscaper/mobile-app")).toBe(true)
		expect(matchesRepoPattern("Leanscaper/Mobile-App", "leanscaper/mobile-app")).toBe(true)
		expect(matchesRepoPattern("leanscaper/web-app", "leanscaper/mobile-app")).toBe(false)
		expect(matchesRepoPattern("leanscaper/mobile-app-2", "leanscaper/mobile-app")).toBe(false)
	})

	test("owner/* matches every repo of that owner", () => {
		expect(matchesRepoPattern("leanscaper/web-app", "leanscaper/*")).toBe(true)
		expect(matchesRepoPattern("pvinis/arogos", "leanscaper/*")).toBe(false)
	})
})
