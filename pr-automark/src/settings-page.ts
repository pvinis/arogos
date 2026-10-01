import { parsePullRequestUrl } from "./github"
import { findMergedPrTabs, prKey, type MergedCheck } from "./merged"
import {
	loadSettings,
	onSettingsChanged,
	parsePatternInput,
	parseRepoInput,
	saveSettings,
	type Rule,
	type Settings,
} from "./settings"

type List = {
	key: keyof Settings
	parse: (input: string) => string | null
	invalid: string
	/** Repo names are case insensitive, patterns are not */
	same: (a: string, b: string) => boolean
}

const sameRepo = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const INVALID_REPO = "Use owner/repo or owner/*, or paste a GitHub link."

const LISTS: List[] = [
	{ key: "closeRepos", parse: parseRepoInput, invalid: INVALID_REPO, same: sameRepo },
	{
		key: "patterns",
		parse: parsePatternInput,
		invalid: "Type a pattern first.",
		same: (a, b) => a === b,
	},
	{ key: "repos", parse: parseRepoInput, invalid: INVALID_REPO, same: sameRepo },
]

let settings: Settings

async function update(change: (settings: Settings) => void) {
	change(settings)
	render()
	await saveSettings(settings)
}

function render() {
	for (const { key } of LISTS) {
		const rules = settings[key]
		const list = document.querySelector(`#${key} .rules`)!
		list.replaceChildren(...rules.map((rule, index) => ruleRow(key, rule, index)))
		document.querySelector<HTMLElement>(`#${key} .empty`)!.hidden = rules.length > 0
	}
}

function ruleRow(key: keyof Settings, rule: Rule, index: number): HTMLLIElement {
	const toggle = document.createElement("input")
	toggle.type = "checkbox"
	toggle.className = "switch"
	toggle.checked = rule.enabled
	toggle.addEventListener("change", () =>
		update((settings) => {
			settings[key][index]!.enabled = toggle.checked
		}),
	)

	const value = document.createElement("code")
	value.textContent = rule.value

	const label = document.createElement("label")
	label.append(toggle, value)

	const remove = document.createElement("button")
	remove.type = "button"
	remove.className = "remove"
	remove.textContent = "×"
	remove.title = `Remove ${rule.value}`
	remove.setAttribute("aria-label", `Remove ${rule.value}`)
	remove.addEventListener("click", () =>
		update((settings) => {
			settings[key].splice(index, 1)
		}),
	)

	const row = document.createElement("li")
	row.classList.toggle("disabled", !rule.enabled)
	row.append(label, remove)
	return row
}

function setUpAddForm({ key, parse, invalid, same }: List) {
	const form = document.querySelector<HTMLFormElement>(`#${key} form`)!
	const input = form.querySelector("input")!
	const error = form.querySelector<HTMLElement>(".error")!

	input.addEventListener("input", () => (error.textContent = ""))
	form.addEventListener("submit", (event) => {
		event.preventDefault()
		const value = parse(input.value)
		if (!value) {
			error.textContent = invalid
			return
		}
		if (settings[key].some((rule) => same(rule.value, value))) {
			error.textContent = `${value} is already in the list.`
			return
		}
		input.value = ""
		void update((settings) => {
			settings[key].push({ value, enabled: true })
		})
	})
}

// Merged PR tabs

const closeButton = document.querySelector<HTMLButtonElement>(".close-merged")!
const mergedList = document.querySelector(".merged-list")!
const mergedStatus = document.querySelector(".merged-status")!

let found: MergedCheck | undefined
let checkRun = 0

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

function showMerged(status: string, check?: MergedCheck) {
	const merged = check?.merged ?? []
	const tabCount = merged.reduce((sum, { tabIds }) => sum + tabIds.length, 0)

	closeButton.hidden = merged.length === 0
	closeButton.textContent = `Close ${plural(tabCount, "merged PR tab")}`
	mergedList.replaceChildren(
		...merged.map(({ pr, title }) => {
			const item = document.createElement("li")
			const ref = document.createElement("code")
			ref.textContent = `${pr.repo}#${pr.number}`
			item.title = `${pr.owner}/${pr.repo}#${pr.number} ${title}`
			item.append(ref, ` ${title}`)
			return item
		}),
	)
	mergedStatus.textContent = status
}

async function checkMergedTabs() {
	const run = ++checkRun
	found = undefined
	showMerged("Checking PR tabs…")

	const tabs = await chrome.tabs.query({ currentWindow: true })
	const check = await findMergedPrTabs(tabs, settings.closeRepos)
	// The repo list changed while we were checking
	if (run !== checkRun) return
	found = check

	const failed = check.failed
		? `Couldn't check ${plural(check.failed, "PR")}, so ${check.failed === 1 ? "its tab stays" : "their tabs stay"} open.`
		: ""
	if (check.checked === 0) showMerged("No PR tabs from these repos in this window.")
	else if (check.merged.length === 0) {
		showMerged(`None of the ${plural(check.checked, "PR")} in this window are merged. ${failed}`)
	} else showMerged(failed, check)
}

closeButton.addEventListener("click", async () => {
	if (!found) return
	const expected = new Map(found.merged.flatMap(({ pr, tabIds }) => tabIds.map((id) => [id, prKey(pr)])))
	found = undefined

	// Only close tabs still showing the PR we checked
	const tabs = await chrome.tabs.query({ currentWindow: true })
	const toClose = tabs.flatMap(({ id, url }) => {
		const pr = url ? parsePullRequestUrl(url) : null
		return id !== undefined && pr && expected.get(id) === prKey(pr) ? [id] : []
	})
	await chrome.tabs.remove(toClose)
	showMerged(`Closed ${plural(toClose.length, "tab")}.`)
})

async function start() {
	settings = await loadSettings()
	render()
	LISTS.forEach(setUpAddForm)
	void checkMergedTabs()

	// Keep the popup and the options page in sync
	onSettingsChanged(async (keys) => {
		settings = await loadSettings()
		render()
		if (keys.includes("closeRepos")) void checkMergedTabs()
	})
}

void start()
