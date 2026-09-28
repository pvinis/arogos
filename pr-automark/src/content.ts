import { isRepoEnabled, pickFilesToMark } from "./automark"
import { collectPaths, findFiles, parseChangesUrl, sha256Hex, type PullRequest } from "./github"
import { enabledValues, loadSettings, onSettingsChanged, type Settings } from "./settings"

const LOG = "[pr-automark]"
// Space out the clicks a bit, so GitHub gets one "mark as viewed" request at a time
const CLICK_INTERVAL_MS = 100
// GitHub keeps changing the page while diffs load, so scan at most this often
const SCAN_INTERVAL_MS = 150

let settings: Settings | undefined

// State for the PR we're on. Reset when moving to another one.
let pullRequest = ""
let seen = new Set<string>()
let queue: string[] = []
let announced = false
let loadedFiles = -1

const pathsByDigest = new Map<string, string>()
const hashedPaths = new Set<string>()
const parsedScripts = new WeakSet<Element>()

function keyOf(pr: PullRequest | null): string {
	return pr ? `${pr.owner}/${pr.repo}#${pr.number}` : ""
}

async function scan() {
	const pr = parseChangesUrl(location.href)
	const key = keyOf(pr)
	if (key !== pullRequest) {
		pullRequest = key
		seen = new Set()
		queue = []
		announced = false
		loadedFiles = -1
	}
	if (!pr || !settings || !isRepoEnabled(settings.repos, pr)) return
	if (!announced) {
		announced = true
		console.info(LOG, `on ${key}, marking`, enabledValues(settings.patterns).join(", "))
	}

	for (const path of collectPaths(document, parsedScripts)) {
		if (hashedPaths.has(path)) continue
		hashedPaths.add(path)
		pathsByDigest.set(await sha256Hex(path), path)
	}
	// Moved to another page while hashing
	if (keyOf(parseChangesUrl(location.href)) !== pullRequest) return

	const files = findFiles(document, pathsByDigest)
	if (files.length !== loadedFiles) {
		loadedFiles = files.length
		console.debug(LOG, `${files.length} files loaded, ${pathsByDigest.size} full paths known`)
	}

	const picked = pickFilesToMark(files, enabledValues(settings.patterns), seen)
	if (picked.length === 0) return
	queue.push(...picked)
	void markQueued()
}

let marking = false

async function markQueued() {
	if (marking) return
	marking = true
	try {
		while (queue.length > 0) {
			const path = queue.shift()!
			// React may have re-rendered the file since the scan, so look its button up again
			const file = findFiles(document, pathsByDigest).find((file) => file.path === path)
			if (!file) {
				// Gone from the page (virtualized away?). Pick it up again when it's back.
				seen.delete(path)
				continue
			}
			if (file.viewed) continue

			file.button.click()
			console.info(LOG, `marked ${path} as viewed`)
			await new Promise((resolve) => setTimeout(resolve, CLICK_INTERVAL_MS))
		}
	} finally {
		marking = false
	}
}

let scanTimer: ReturnType<typeof setTimeout> | undefined
let scanning = Promise.resolve()

function scheduleScan() {
	if (scanTimer !== undefined) return
	scanTimer = setTimeout(() => {
		scanTimer = undefined
		scanning = scanning.then(scan).catch((error) => console.error(LOG, error))
	}, SCAN_INTERVAL_MS)
}

async function refreshSettings() {
	settings = await loadSettings()
	// Queued files may not match anymore. Forget them, the next scan decides again.
	for (const path of queue) seen.delete(path)
	queue = []
	scheduleScan()
}

// GitHub navigates without full page loads, and loads diffs progressively, so watch everything.
// Scans are cheap when we're not on a PR's changes.
new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true })
onSettingsChanged(refreshSettings)
void refreshSettings()
