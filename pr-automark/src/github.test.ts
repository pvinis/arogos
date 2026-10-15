import { beforeEach, describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import { collectPaths, findFiles, parseChangesUrl, parsePullRequestUrl, sha256Hex } from "./github"

// Shaped after GitHub's React "Files changed" view (`/pull/<n>/changes`), as of October 2026
function fileHtml(
	path: string,
	digest: string,
	{ header = path, pressed = "false" as string | null, checkedIcon = false, richDiff = false } = {},
) {
	const pressedAttribute = pressed === null ? "" : `aria-pressed="${pressed}"`
	const label = pressed === "true" || checkedIcon ? "Viewed" : "Not Viewed"
	const icon = checkedIcon ? `<svg class="octicon octicon-checkbox-fill"></svg>` : ""
	// Markdown and image files get a source/rich diff toggle, which is also made of pressable buttons
	const toggle = richDiff
		? `<button type="button" class="prc-Button-ButtonBase-9n-Xk" aria-pressed="true"></button>
			<button type="button" class="prc-Button-ButtonBase-9n-Xk" aria-pressed="false"></button>`
		: ""
	return `
		<div class="diffEntry__YLOXdm">
			<div id="diff-${digest}" class="diffTargetable__jbrCub diff__GZFl4M" role="region">
				<div class="diffHeaderWrapper__INiK1j" data-diff-header-wrapper="true">
					<div class="diff-file-header__CV6GPS">
						<h3 class="file-name__8GKEHg file-name-truncate__1IBLuh">
							<a href="#diff-${digest}"><code>‎${header}‏</code></a>
						</h3>
						${toggle}
						<button type="button" class="prc-Button-ButtonBase-9n-Xk iconOnly__kjZ2po" aria-label="${label}" ${pressedAttribute}>
							${icon}<span class="prc-Button-Label-FWkx3">Viewed</span>
						</button>
					</div>
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

describe("parsePullRequestUrl", () => {
	const pr = { owner: "leanscaper", repo: "mobile-app", number: 1265 }

	test("reads any page of a PR", () => {
		for (const path of ["", "/", "/changes", "/changes#diff-abc", "/files", "/commits", "/checks", "?w=1"]) {
			expect(parsePullRequestUrl(`https://github.com/leanscaper/mobile-app/pull/1265${path}`)).toEqual(pr)
		}
	})

	test("ignores anything that isn't a PR on github.com", () => {
		expect(parsePullRequestUrl("https://github.com/leanscaper/mobile-app/pulls")).toBeNull()
		expect(parsePullRequestUrl("https://github.com/leanscaper/mobile-app/issues/1265")).toBeNull()
		expect(parsePullRequestUrl("https://github.com/leanscaper/mobile-app/pull/new/branch")).toBeNull()
		expect(parsePullRequestUrl("https://gist.github.com/leanscaper/mobile-app/pull/1265")).toBeNull()
		expect(parsePullRequestUrl("http://github.com/leanscaper/mobile-app/pull/1265")).toBeNull()
		expect(parsePullRequestUrl("chrome://extensions")).toBeNull()
		expect(parsePullRequestUrl("")).toBeNull()
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

	test("picks the Viewed button, not the rich diff toggle", () => {
		document.body.innerHTML = fileHtml("README.md", "e".repeat(64), { richDiff: true })
		const files = findFiles(document, new Map())

		expect(files.map(({ path, viewed }) => ({ path, viewed }))).toEqual([{ path: "README.md", viewed: false }])
		expect(files[0]?.button.getAttribute("aria-label")).toBe("Not Viewed")
	})

	test("skips files that are still loading", () => {
		document.body.innerHTML = `
			<div class="diffEntry__YLOXdm">
				<div aria-label="Loading src/components/BottomNav.tests.tsx" class="Skeleton"></div>
			</div>`

		expect(findFiles(document, new Map())).toEqual([])
	})
})
