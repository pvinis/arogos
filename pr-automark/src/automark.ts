import type { FileEntry, PullRequest } from "./github"
import { matchesFilePattern, matchesRepoPattern } from "./glob"
import type { Rule } from "./settings"

export function isRepoEnabled(repos: Rule[], pr: PullRequest): boolean {
	const repo = `${pr.owner}/${pr.repo}`
	return repos.some((rule) => rule.enabled && matchesRepoPattern(repo, rule.value))
}

/**
 * Paths of the files to mark as viewed. A matching file only counts the first time it shows up
 * (remembered in `seen`), so a file you un-mark by hand stays un-marked.
 */
export function pickFilesToMark(files: FileEntry[], patterns: string[], seen: Set<string>): string[] {
	const picked: string[] = []
	for (const { path, viewed } of files) {
		if (seen.has(path) || !patterns.some((pattern) => matchesFilePattern(path, pattern))) continue
		seen.add(path)
		if (!viewed) picked.push(path)
	}
	return picked
}
