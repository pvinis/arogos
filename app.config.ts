import type { ConfigContext, ExpoConfig } from "expo/config"
import v from "./version.json"

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,

	name: "Arogos",
	slug: "arogos",
	scheme: "arogos",
	version: v.version,
	icon: "./assets/app-icon.png",
	ios: {
		bundleIdentifier: "codes.quad.arogos",
		buildNumber: String(v.build),
		config: { usesNonExemptEncryption: false },
	},
	android: {
		package: "codes.quad.arogos",
		versionCode: v.build,
		permissions: ["android.permission.READ_CALENDAR", "android.permission.WRITE_CALENDAR"],
	},
	userInterfaceStyle: "automatic",
	plugins: [
		"expo-router",
		"expo-localization",
		["expo-font", { fonts: ["./assets/fonts/Iosevka.ttf"] }],
		["expo-calendar", { calendarPermission: "Needed to read calendar events." }],
	],
	extra: {
		router: { origin: false },
		eas: { projectId: "1a8ddfee-45a4-413c-a1fa-4f76e353d39b" },
	},
})
