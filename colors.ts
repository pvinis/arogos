type Colors = Record<
	| "background"
	| "on-background",
	string
>

export const colors: Record<"light" | "dark", Colors> = {
	light: {
		background: "white",
		"on-background": "black",
	},
	dark: {
		background: "black",
		"on-background": "white",
	},
}
