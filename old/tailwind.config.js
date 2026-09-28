const plugin = require("tailwindcss/plugin")
const { hairlineWidth } = require("nativewind/theme")

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: {
				background: "var(--color-background)",
				"on-background": "var(--color-on-background)",
				"on-background-low": "var(--color-on-background-low)",
				primary: "var(--color-primary)",
				"on-primary": "var(--color-on-primary)",
				opening: "var(--color-opening)",
				tint: "var(--color-tint)",
				separator: "var(--color-separator)",
				t: "red",
			},
			fontFamily: { "mono-base": "Iosevka" },
			height: {
				hairline: hairlineWidth(),
			},
		},
	},
	plugins: [
		require("nativewind/dist/tailwind/safe-area").safeArea,
		plugin(({ addUtilities }) =>
			addUtilities({
				// usually paired with `absolute`
				".full": {
					top: 0,
					bottom: 0,
					left: 0,
					right: 0,
				},
			}),
		),
	],
}
