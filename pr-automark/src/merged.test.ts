import { describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import type { PullRequest } from "./github"
import { findMergedPrTabs, hovercardUrl, readHovercard, type Hovercard, type TabInfo } from "./merged"

const parser = new new Window().DOMParser() as unknown as DOMParser

// Trimmed from real hovercards (`/pull/<n>/hovercard`), September 2026
const STATE_LABELS = {
	merged: `<span title="Status: Merged" data-view-component="true" class="State State--merged State--small">
		<svg class="octicon octicon-git-merge" aria-hidden="true"></svg> Merged</span>`,
	open: `<span title="Status: Open" data-view-component="true" class="State State--open State--small">
		<svg class="octicon octicon-git-pull-request" aria-hidden="true"></svg> Open</span>`,
	draft: `<span title="Status: Draft" data-view-component="true" class="State State--small">
		<svg class="octicon octicon-git-pull-request-draft" aria-hidden="true"></svg> Draft</span>`,
	closed: `<span title="Status: Closed" data-view-component="true" class="State State--closed State--small">
		<svg class="octicon octicon-git-pull-request-closed" aria-hidden="true"></svg> Closed</span>`,
}

function hovercard(stateLabel: string, description = "") {
	return `<div class="tmp-p-3">
		<div class="f6 color-fg-muted mb-1">
			<a class="d-inline-block text-underline Link--secondary" href="/leanscaper/mobile-app">leanscaper/mobile-app</a>
			on <span>Sep 20</span>
		</div>
		<div class="d-flex flex-column f4 lh-condensed mt-2">
			<a href="/leanscaper/mobile-app/pull/1265" class="no-underline Link--primary d-block">
				<h4 class="d-inline dashboard-break-word markdown-title"><bdi>Revised <code>tab</code> bar</bdi></h4>
				<span class="color-fg-muted">#1265</span>
			</a>
			<div class="mt-2 d-flex flex-wrap gap-2">${stateLabel}</div>
		</div>
		<div class="lh-condensed color-fg-muted tmp-mt-3 mb-0 markdown-body-short">${description}</div>
	</div>`
}

const PR = { owner: "leanscaper", repo: "mobile-app", number: 1265 }

test("hovercardUrl always points at the PR itself", () => {
	expect(hovercardUrl(PR)).toBe("https://github.com/leanscaper/mobile-app/pull/1265/hovercard")
})

describe("readHovercard", () => {
	test("reads each state and the title", () => {
		for (const state of ["merged", "open", "draft", "closed"] as const) {
			expect(readHovercard(hovercard(STATE_LABELS[state]), parser)).toEqual({
				state,
				title: "Revised tab bar",
			})
		}
	})

	test("isn't fooled by merged PRs mentioned in the description", () => {
		const description = `<p>Follow-up to <a class="issue-link js-issue-link" data-hovercard-type="pull_request"
			href="https://github.com/leanscaper/mobile-app/pull/1200">#1200</a>, which got merged</p>`
		expect(readHovercard(hovercard(STATE_LABELS.open, description), parser)?.state).toBe("open")
	})

	test("gives up on markup it doesn't recognize", () => {
		expect(readHovercard("", parser)).toBeNull()
		expect(readHovercard("<p>Page not found</p>", parser)).toBeNull()
		expect(readHovercard(hovercard(STATE_LABELS.merged + STATE_LABELS.open), parser)).toBeNull()
		expect(readHovercard(hovercard(`<span title="Status: Merged" class="State">Merged</span>`), parser)).toBeNull()
		expect(readHovercard(hovercard(`<span title="Status: Queued" class="State">Queued</span>`), parser)).toBeNull()
	})
})

describe("findMergedPrTabs", () => {
	const repos = [
		{ value: "leanscaper/mobile-app", enabled: true },
		{ value: "leanscaper/web-app", enabled: false },
	]
	let nextId = 1
	const tab = (url: string, extra: Partial<TabInfo> = {}): TabInfo & { id: number } => ({
		id: nextId++,
		url,
		pinned: false,
		...extra,
	})
	const states: Record<number, Hovercard["state"] | "error" | "unknown"> = {
		1265: "merged",
		1266: "open",
		1267: "closed",
		1268: "error",
		1269: "unknown",
		1270: "merged",
	}
	const check = async (pr: PullRequest): Promise<Hovercard | null> => {
		const state = states[pr.number]
		if (state === "error") throw new Error("network down")
		if (!state || state === "unknown") return null
		return { state, title: `PR ${pr.number}` }
	}
	const pr = (n: number, path = "") => `https://github.com/leanscaper/mobile-app/pull/${n}${path}`

	test("finds merged PRs from enabled repos, with all their tabs", async () => {
		const tabs = [
			tab(pr(1265)),
			tab(pr(1265, "/changes#diff-568d197e")),
			tab("https://github.com/Leanscaper/Mobile-App/pull/1265/commits"),
			tab(pr(1266)),
			tab(pr(1267)),
			tab("https://github.com/leanscaper/mobile-app/pulls"),
			tab("https://github.com/leanscaper/mobile-app/issues/1265"),
			tab("https://example.com/leanscaper/mobile-app/pull/1265"),
			tab("chrome://extensions"),
			tab(""),
		]

		const result = await findMergedPrTabs(tabs, repos, check)
		expect(result.merged).toEqual([
			{ pr: { owner: "leanscaper", repo: "mobile-app", number: 1265 }, title: "PR 1265", tabIds: [tabs[0]!.id, tabs[1]!.id, tabs[2]!.id] },
		])
		expect(result).toMatchObject({ checked: 3, failed: 0 })
	})

	test("leaves pinned tabs and other repos alone", async () => {
		const tabs = [
			tab(pr(1265), { pinned: true }),
			tab("https://github.com/leanscaper/web-app/pull/1265"),
			tab("https://github.com/pvinis/arogos/pull/3"),
		]
		const checked: string[] = []

		const result = await findMergedPrTabs(tabs, repos, async (pr) => {
			checked.push(`${pr.repo}#${pr.number}`)
			return { state: "merged", title: "" }
		})
		expect(result).toEqual({ merged: [], checked: 0, failed: 0 })
		expect(checked).toEqual([])
	})

	test("counts PRs it couldn't check, and keeps their tabs", async () => {
		const result = await findMergedPrTabs([tab(pr(1268)), tab(pr(1269)), tab(pr(1270))], repos, check)
		expect(result.merged.map((merged) => merged.pr.number)).toEqual([1270])
		expect(result).toMatchObject({ checked: 3, failed: 2 })
	})

	test("checks a few PRs at a time", async () => {
		let running = 0
		let mostRunning = 0
		const tabs = Array.from({ length: 10 }, (_, i) => tab(pr(2000 + i)))

		await findMergedPrTabs(tabs, repos, async () => {
			mostRunning = Math.max(mostRunning, ++running)
			await new Promise((resolve) => setTimeout(resolve, 5))
			running--
			return null
		})
		expect(mostRunning).toBe(4)
	})
})
