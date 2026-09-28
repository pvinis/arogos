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

const LISTS: List[] = [
	{
		key: "patterns",
		parse: parsePatternInput,
		invalid: "Type a pattern first.",
		same: (a, b) => a === b,
	},
	{
		key: "repos",
		parse: parseRepoInput,
		invalid: "Use owner/repo or owner/*, or paste a GitHub link.",
		same: (a, b) => a.toLowerCase() === b.toLowerCase(),
	},
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
		const list = document.querySelector(`#${key} ul`)!
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

async function start() {
	settings = await loadSettings()
	render()
	LISTS.forEach(setUpAddForm)
	// Keep the popup and the options page in sync
	onSettingsChanged(async () => {
		settings = await loadSettings()
		render()
	})
}

void start()
