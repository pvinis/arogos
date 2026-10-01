// Builds the extension into dist/, which is the folder to load in the browser.
// `bun run build.ts --watch` rebuilds on every change.
import { watch } from "node:fs"
import { cp, rm } from "node:fs/promises"

const OUT = "dist"

async function build(): Promise<boolean> {
	await rm(OUT, { recursive: true, force: true })
	const result = await Bun.build({
		entrypoints: ["src/content.ts", "src/settings-page.ts"],
		outdir: OUT,
		target: "browser",
		// Content scripts can't be ES modules
		format: "iife",
	})
	if (!result.success) {
		for (const log of result.logs) console.error(log)
		return false
	}
	await cp("public", OUT, { recursive: true })
	return true
}

if (process.argv.includes("--watch")) {
	await build()
	console.log(`Built ${OUT}/. Watching for changes…`)

	let timer: Timer | undefined
	for (const folder of ["src", "public"]) {
		watch(folder, { recursive: true }, () => {
			clearTimeout(timer)
			timer = setTimeout(async () => {
				if (await build()) console.log(`Rebuilt ${OUT}/ at ${new Date().toLocaleTimeString()}`)
			}, 100)
		})
	}
} else if (await build()) {
	console.log(`Built ${OUT}/`)
} else {
	process.exit(1)
}
