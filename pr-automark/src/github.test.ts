import { beforeEach, describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import { collectPaths, findFiles, parseChangesUrl, sha256Hex } from "./github"

// Shaped after GitHub's React "Files changed" view (`/pull/<n>/changes`), as of September 2026
function fileHtml(
	path: string,
	digest: string,
	{ header = path, pressed = "false" as string | null, checkedIcon = false } = {},
) {
	const pressedAttribute = pressed === null ? "" : `aria-pressed="${pressed}"`
	const icon = checkedIcon ? `<svg class="octicon octicon-checkbox-fill"></svg>` : ""
	return `
		<div class="PullRequestDiffsList-module__diffEntry__a1b2c">
			<div id="diff-${digest}" class="Diff-module__diffTargetable__d3e4f">
				<div class="DiffFileHeader-module__diff-file-header__g5h6i">
					<h3 class="DiffFileHeader-module__file-name__j7k8l">
						<a href="#diff-${digest}"><code>‎${header}‏</code></a>
					</h3>
					<button type="button" class="MarkAsViewedButton-module__viewed__x1y2z" ${pressedAttribute}>
						${icon}Viewed
					</button>
				</div>
				<table><tr><td id="diff-${digest}R12">+ added line</td></tr></table>
			</div>
		</div>`
}

const TAB_SWITCH_INTENT = "src/navigation/tabSwitchIntent.ts"
// From a real PR link: https://github.com/leanscaper/mobile-app/pull/1265/changes#diff-568d…
const TAB_SWITCH_INTENT_DIGEST = "568d197e418155e2acbf4f95eba1c36368057ee5d0311b9d17d27bee49f1c17c"

let document: Document

beforeEach(() => {
	document = new Window().document as unknown as Document
})

describe("parseChangesUrl", () => {
	test("reads owner, repo and number from a changes page", () => {
		expect(
			parseChangesUrl(
				`https://github.com/leanscaper/mobile-app/pull/1265/changes#diff-${TAB_SWITCH_INTENT_DIGEST}`,
			),
		).toEqual({ owner: "leanscaper", repo: "mobile-app", number: 1265 })
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app/pull/1265/changes/abc123")).toEqual(
			{ owner: "leanscaper", repo: "mobile-app", number: 1265 },
		)
	})

	test("ignores other pages", () => {
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app/pull/1265")).toBeNull()
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app/pull/1265/files")).toBeNull()
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app/pull/1265/commits")).toBeNull()
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app/pulls")).toBeNull()
		expect(parseChangesUrl("https://github.com/leanscaper/mobile-app")).toBeNull()
	})
})

test("sha256Hex gives the digest GitHub uses in file anchors", async () => {
	expect(await sha256Hex(TAB_SWITCH_INTENT)).toBe(TAB_SWITCH_INTENT_DIGEST)
})

describe("collectPaths", () => {
	test("reads full paths from the file tree and the embedded page data", () => {
		const data = {
			payload: {
				pullRequestsChangesRoute: {
					diffSummaries: [
						{ path: "src/components/BottomNav.tests.tsx", pathDigest: "x", markedAsViewed: false },
						{ path: TAB_SWITCH_INTENT, pathDigest: "y", markedAsViewed: true },
					],
				},
			},
		}
		document.body.innerHTML = `
			<ul role="tree">
				<li role="treeitem" id="src" class="DiffFileTree-module__file-tree-row__q"></li>
				<li role="treeitem" id="src/components/BottomNav.tests.tsx" class="DiffFileTree-module__file-tree-row__q"></li>
				<li role="treeitem" id="global.css" class="DiffFileTree-module__file-tree-row__q"></li>
			</ul>
			<script type="application/json" data-target="react-app.embeddedData">${JSON.stringify(data)}</script>
			<script type="application/json" data-target="react-app.embeddedData">{ not json</script>`

		const parsedScripts = new WeakSet<Element>()
		expect(collectPaths(document, parsedScripts).sort()).toEqual([
			"global.css",
			"src",
			"src/components/BottomNav.tests.tsx",
			TAB_SWITCH_INTENT,
		])
		// the embedded data is only parsed once
		expect(collectPaths(document, parsedScripts)).not.toContain(TAB_SWITCH_INTENT)
	})
})

describe("findFiles", () => {
	test("prefers the full path from the digest over a shortened header", () => {
		document.body.innerHTML = fileHtml(TAB_SWITCH_INTENT, TAB_SWITCH_INTENT_DIGEST, {
			header: "…/navigation/tabSwitchIntent.ts",
		})
		const files = findFiles(document, new Map([[TAB_SWITCH_INTENT_DIGEST, TAB_SWITCH_INTENT]]))

		expect(files.map(({ path, viewed }) => ({ path, viewed }))).toEqual([
			{ path: TAB_SWITCH_INTENT, viewed: false },
		])
		expect(files[0]?.button.textContent).toContain("Viewed")
	})

	test("falls back to the header text, without the invisible direction marks", () => {
		document.body.innerHTML = fileHtml("src/components/BottomNav.tests.tsx", "a".repeat(64))

		expect(findFiles(document, new Map()).map((file) => file.path)).toEqual([
			"src/components/BottomNav.tests.tsx",
		])
	})

	test("reads the viewed state from aria-pressed, or from the checked icon", () => {
		document.body.innerHTML = [
			fileHtml("a.ts", "a".repeat(64), { pressed: "true" }),
			fileHtml("b.ts", "b".repeat(64), { pressed: "false" }),
			fileHtml("c.ts", "c".repeat(64), { pressed: null, checkedIcon: true }),
			fileHtml("d.ts", "d".repeat(64), { pressed: null }),
		].join("")

		expect(findFiles(document, new Map()).map(({ path, viewed }) => [path, viewed])).toEqual([
			["a.ts", true],
			["b.ts", false],
			["c.ts", true],
			["d.ts", false],
		])
	})

	test("skips files that are still loading", () => {
		document.body.innerHTML = `
			<div class="PullRequestDiffsList-module__diffEntry__a1b2c">
				<div aria-label="Loading src/components/BottomNav.tests.tsx" class="Skeleton"></div>
			</div>`

		expect(findFiles(document, new Map())).toEqual([])
	})
})
