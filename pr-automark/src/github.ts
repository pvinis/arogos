// Everything that knows about GitHub's React "Files changed" view (`/pull/<n>/changes`)

export type PullRequest = { owner: string; repo: string; number: number }

export type FileEntry = {
	path: string
	button: HTMLButtonElement
	viewed: boolean
}

// Also matches `/changes/<commit>` and `/changes/<from>..<to>`
const CHANGES_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/changes(?:\/|$)/

export function parseChangesUrl(url: string): PullRequest | null {
	const match = CHANGES_PATH.exec(new URL(url).pathname)
	if (!match) return null
	return { owner: match[1]!, repo: match[2]!, number: Number(match[3]) }
}

/** GitHub ids each file's diff as `diff-<sha256 of its path>` */
export async function sha256Hex(text: string): Promise<string> {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Full paths of the PR's files, from the file tree and the data GitHub embeds in the page.
 * The embedded data can be big, so each script is only parsed once per `parsedScripts`.
 */
export function collectPaths(root: ParentNode, parsedScripts = new WeakSet<Element>()): string[] {
	const paths = new Set<string>()

	// file tree rows use the full path as their id
	for (const row of root.querySelectorAll('[role="treeitem"][id]')) paths.add(row.id)

	for (const script of root.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
		if (parsedScripts.has(script)) continue
		parsedScripts.add(script)
		try {
			const data = JSON.parse(script.textContent ?? "")
			const summaries = data?.payload?.pullRequestsChangesRoute?.diffSummaries
			if (!Array.isArray(summaries)) continue
			for (const summary of summaries) {
				if (typeof summary?.path === "string") paths.add(summary.path)
			}
		} catch {
			// some other embedded data we don't understand
		}
	}

	return [...paths]
}

const VIEWED_BUTTON = 'button[class*="MarkAsViewedButton"]'
const FILE_CONTAINER = '[class*="Diff-module__diffTargetable"], [class*="diffEntry"]'
const FILE_ID = /^diff-([0-9a-f]{64})$/
const DIRECTION_MARKS = /[‎‏]/g

/** Files whose Viewed button has rendered. Files that are still loading have none yet. */
export function findFiles(root: ParentNode, pathsByDigest: ReadonlyMap<string, string>): FileEntry[] {
	const files: FileEntry[] = []
	for (const button of root.querySelectorAll<HTMLButtonElement>(VIEWED_BUTTON)) {
		const path = filePath(button, pathsByDigest)
		if (path) files.push({ path, button, viewed: isViewed(button) })
	}
	return files
}

function filePath(button: Element, pathsByDigest: ReadonlyMap<string, string>): string | undefined {
	const digest = FILE_ID.exec(button.closest('[id^="diff-"]')?.id ?? "")?.[1]
	const known = digest && pathsByDigest.get(digest)
	if (known) return known

	// Headers shorten long paths to `…/folder/name.ts`, which still works for file name patterns
	const container = button.closest(FILE_CONTAINER)
	const name =
		container?.querySelector('[class*="file-name"] code') ??
		container?.querySelector('[class*="file-name"]')
	return name?.textContent?.replace(DIRECTION_MARKS, "").trim() || undefined
}

function isViewed(button: Element): boolean {
	const pressed = button.getAttribute("aria-pressed")
	if (pressed !== null) return pressed === "true"
	return button.querySelector(".octicon-checkbox-fill") !== null
}
