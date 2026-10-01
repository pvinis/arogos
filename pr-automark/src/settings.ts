export type Rule = { value: string; enabled: boolean }

export type Settings = {
	/** File patterns to mark as viewed */
	patterns: Rule[]
	/** Repos to do it in, as `owner/repo` or `owner/*` */
	repos: Rule[]
	/** Repos whose merged PR tabs the popup closes */
	closeRepos: Rule[]
}

export const DEFAULT_SETTINGS: Settings = {
	patterns: [
		{ value: "*.tests.tsx", enabled: true },
		{ value: "*.tests.ts", enabled: true },
		{ value: "*.stories.tsx", enabled: true },
	],
	repos: [{ value: "leanscaper/mobile-app", enabled: true }],
	closeRepos: [{ value: "leanscaper/mobile-app", enabled: true }],
}

export async function loadSettings(): Promise<Settings> {
	// Keys that were never saved fall back to the defaults, so a fresh install starts pre-filled
	return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings
}

export async function saveSettings(settings: Settings): Promise<void> {
	await chrome.storage.sync.set(settings)
}

/** Calls back with the keys that changed */
export function onSettingsChanged(callback: (keys: (keyof Settings)[]) => void): void {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "sync") callback(Object.keys(changes) as (keyof Settings)[])
	})
}

export function enabledValues(rules: Rule[]): string[] {
	return rules.filter((rule) => rule.enabled).map((rule) => rule.value)
}

const NAME = /^[\w.*?-]+$/

/** `owner/repo`, `owner/*`, or any github.com link into a repo */
export function parseRepoInput(input: string): string | null {
	const [owner, repo] = input
		.trim()
		.replace(/^(?:https?:\/\/)?github\.com\//i, "")
		.split("/")
	if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) return null
	return `${owner}/${repo}`
}

export function parsePatternInput(input: string): string | null {
	return input.trim() || null
}
