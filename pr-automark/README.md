# PR Automark

A Chromium extension (made for [Helium](https://helium.computer), works in any Chromium browser) that marks files as **Viewed** on GitHub pull requests as soon as they load, so tests, stories and other noise get out of the way.

You choose which files, with patterns you can each turn on and off, and which repos. It starts out with `*.tests.tsx`, `*.tests.ts` and `*.stories.tsx` in `leanscaper/mobile-app`.

It can also close the tabs of merged PRs. Open the popup and it checks the PR tabs in the current window, then offers a **Close merged PR tabs** button. That only covers repos in its own list, which starts with `leanscaper/mobile-app`.

## Install

```sh
bun install
bun run build
```

1. Open `chrome://extensions` in Helium.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `dist` folder.
4. Optionally pin it: puzzle-piece icon in the toolbar, then the pin next to PR Automark.

Click the toolbar icon to close merged PR tabs, or to change the patterns and repos.

After changing the code, run `bun run build` again, or keep `bun run dev` running, then click the reload icon on the extension's card and refresh the GitHub tab.

## Patterns

- Without a `/`, a pattern matches the file name in any folder: `*.tests.tsx`.
- With a `/`, it matches the full path from the repo root: `.changes/*.yml`.
- `*` and `?` stay within a folder, `**` crosses folders: `src/**/__snapshots__/*`.
- File patterns are case sensitive. Repos are `owner/repo` or `owner/*`, and a pasted GitHub link works too.

## How it works

On `github.com/<owner>/<repo>/pull/<n>/changes`, when the repo is enabled, the content script watches the page and clicks GitHub's own Viewed button for each matching file that isn't viewed yet. It doesn't need a token, and the page updates right away.

- Files are marked as they load, so a big PR finishes marking once its diffs are in.
- Clicks go out one at a time, 100ms apart.
- A file you un-mark by hand stays un-marked until you reload the page.
- GitHub shortens long paths in file headers. Full paths come from the file tree and the page data instead, matched by the `diff-<sha256 of the path>` id each file has.

Limitations:

- Only the new "Files changed" view (`/changes`) is supported, not the legacy `/files` view.
- On very large PRs GitHub can switch to single-file or virtualized mode, where only the files on screen exist in the page. Those get marked as you reach them.
- It relies on GitHub's markup (`MarkAsViewedButton` class, `diff-<hash>` ids), which GitHub can change at any time.

## Closing merged PR tabs

Opening the popup looks at every tab in the current window that's on a PR (any page of it: conversation, `/changes`, `/commits`…) from an enabled repo. For each of those PRs, it fetches the card GitHub shows when you hover a PR link, `github.com/<owner>/<repo>/pull/<n>/hovercard`.

- It uses your github.com login, so private repos work without a token.
- The state is always fresh, even for tabs opened days ago or unloaded by the browser.
- The card has exactly one status label. A tab only closes when that label is "Merged". Errors, 404s or unfamiliar markup keep the tab open, and the popup says how many PRs it couldn't check.
- If one PR is open in several tabs, all of them close.
- Pinned tabs are left alone.
- Right before closing, each tab is checked again to make sure it's still on the same PR.

The hovercard is an internal GitHub endpoint, so this can break if GitHub changes it. If it does, the popup just finds nothing to close.

## Seeing what it does

To see what automark is doing, open DevTools on the PR and filter the console by `[pr-automark]`. Turn on the Verbose level to also see how many files were found.

## Development

```sh
bun run dev        # rebuild dist/ on every change
bun test           # unit tests
bun run typecheck
```

- `src/content.ts` runs on GitHub pages and wires everything together.
- `src/github.ts` holds everything that knows GitHub's markup.
- `src/automark.ts` decides what to mark.
- `src/merged.ts` finds the tabs of merged PRs.
- `src/glob.ts` does the pattern matching.
- `src/settings.ts` stores the settings, and `src/settings-page.ts` is the popup and options page.
