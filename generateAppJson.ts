#!/usr/bin/env pnpx ts-node

import fs from "fs"
import { ExpoConfig } from "expo/config"
import v from "./version.json"

const config: ExpoConfig = {
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
	},
	userInterfaceStyle: "automatic",
	plugins: [
		"expo-router",
		"expo-localization",
		["expo-font", { fonts: ["./assets/fonts/Iosevka.ttf"] }],
		["expo-calendar", { calendarPermission: "Needed to read calendar events." }],
	],

	extra: {},

	runtimeVersion: { policy: "appVersion" },
}

fs.writeFileSync("app.json", JSON.stringify({ expo: config }))
