const cache = new Map<string, RegExp>()

/** `*` and `?` stay within one folder, `**` crosses folders. Everything else is literal. */
function globToRegExp(glob: string): RegExp {
	const cached = cache.get(glob)
	if (cached) return cached

	let source = ""
	for (let i = 0; i < glob.length; i++) {
		const char = glob[i]!
		if (char === "*" && glob[i + 1] === "*") {
			// `**/` also matches no folder at all, so `src/**/*.ts` matches `src/a.ts`
			const slash = glob[i + 2] === "/"
			source += slash ? "(?:.*/)?" : ".*"
			i += slash ? 2 : 1
		} else if (char === "*") {
			source += "[^/]*"
		} else if (char === "?") {
			source += "[^/]"
		} else {
			source += char.replace(/[.+^${}()|[\]\\]/, "\\$&")
		}
	}

	const regExp = new RegExp(`^${source}$`)
	cache.set(glob, regExp)
	return regExp
}

/** Like .gitignore: a pattern without a `/` matches the file name, one with a `/` the full path. */
export function matchesFilePattern(path: string, pattern: string): boolean {
	if (!pattern.includes("/")) {
		return globToRegExp(pattern).test(path.slice(path.lastIndexOf("/") + 1))
	}
	return globToRegExp(pattern.replace(/^\//, "")).test(path)
}

/** `owner/repo` or `owner/*`. GitHub treats names case insensitively, so do we. */
export function matchesRepoPattern(repo: string, pattern: string): boolean {
	return globToRegExp(pattern.toLowerCase()).test(repo.toLowerCase())
}
