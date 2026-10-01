// Finding the tabs of merged PRs, so the popup can close them

import { isRepoEnabled } from "./automark"
import { parsePullRequestUrl, type PullRequest } from "./github"
import type { Rule } from "./settings"

export type Hovercard = { state: "merged" | "open" | "draft" | "closed"; title: string }

/** The bits of `chrome.tabs.Tab` we need */
export type TabInfo = { id?: number; url?: string; pinned: boolean }

export type MergedPr = { pr: PullRequest; title: string; tabIds: number[] }

export type MergedCheck = {
	merged: MergedPr[]
	/** PRs looked up */
	checked: number
	/** PRs whose state we couldn't tell. Their tabs stay open. */
	failed: number
}

const STATES: Record<string, Hovercard["state"]> = {
	"Status: Merged": "merged",
	"Status: Open": "open",
	"Status: Draft": "draft",
	"Status: Closed": "closed",
}

// The card GitHub shows when hovering a PR link. Small, and always up to date.
export function hovercardUrl({ owner, repo, number }: PullRequest): string {
	return `https://github.com/${owner}/${repo}/pull/${number}/hovercard`
}

/** The PR's state and title, or null when the markup isn't what we expect */
export function readHovercard(html: string, parser: DOMParser): Hovercard | null {
	const card = parser.parseFromString(html, "text/html")
	// Exactly one, so we never mistake some other PR's label for this one's
	const labels = card.querySelectorAll('.State[title^="Status: "]')
	if (labels.length !== 1) return null

	const label = labels[0]!
	const state = STATES[label.getAttribute("title")!]
	if (!state || (state === "merged" && !label.classList.contains("State--merged"))) return null

	const title = card.querySelector("h4")?.textContent?.trim() ?? ""
	return { state, title }
}

/** Looks the PR up with your github.com login, which the extension's host permission lets through */
export async function fetchHovercard(pr: PullRequest): Promise<Hovercard | null> {
	const response = await fetch(hovercardUrl(pr), {
		// Without it GitHub answers 406
		headers: { "X-Requested-With": "XMLHttpRequest" },
		cache: "no-store",
		signal: AbortSignal.timeout(10_000),
	})
	// A private repo looks like a 404 when you're logged out
	if (!response.ok || response.redirected) return null
	return readHovercard(await response.text(), new DOMParser())
}

const CONCURRENCY = 4

/** Merged PRs among the tabs, from enabled repos, skipping pinned tabs. Never guesses. */
export async function findMergedPrTabs(
	tabs: TabInfo[],
	repos: Rule[],
	check: (pr: PullRequest) => Promise<Hovercard | null> = fetchHovercard,
): Promise<MergedCheck> {
	const byPr = new Map<string, { pr: PullRequest; tabIds: number[] }>()
	for (const { id, url, pinned } of tabs) {
		const pr = url ? parsePullRequestUrl(url) : null
		if (id === undefined || pinned || !pr || !isRepoEnabled(repos, pr)) continue
		const key = prKey(pr)
		const entry = byPr.get(key) ?? { pr, tabIds: [] }
		entry.tabIds.push(id)
		byPr.set(key, entry)
	}

	const entries = [...byPr.values()]
	const cards: (Hovercard | null)[] = []
	let next = 0
	async function worker() {
		while (next < entries.length) {
			const index = next++
			cards[index] = await check(entries[index]!.pr).catch(() => null)
		}
	}
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker))

	return {
		merged: entries.flatMap((entry, index) => {
			const card = cards[index]
			return card?.state === "merged" ? [{ ...entry, title: card.title }] : []
		}),
		checked: entries.length,
		failed: cards.filter((card) => !card).length,
	}
}

/** GitHub names are case insensitive */
export function prKey({ owner, repo, number }: PullRequest): string {
	return `${owner}/${repo}#${number}`.toLowerCase()
}
