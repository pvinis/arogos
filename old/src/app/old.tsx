import { Text, Screen } from "@/design-system"
import {
	EntityTypes,
	getCalendarsAsync,
	getDefaultCalendarAsync,
	requestCalendarPermissionsAsync,
} from "expo-calendar"
import { useEffect } from "react"
import { Button } from "react-native"
import { openURL } from "expo-linking"

export default function Main() {
	useEffect(() => {
		;(async () => {
			const { status } = await requestCalendarPermissionsAsync()
			if (status === "granted") {
				const calendars = await getCalendarsAsync(EntityTypes.EVENT)
				console.log("Here are all your calendars:")
				console.log({ calendars })
			}
		})()
	}, [])

	async function getDefaultCalendarSource() {
		const defaultCalendar = await getDefaultCalendarAsync()
		return defaultCalendar.source
	}

	return (
		<Screen>
			<Text style={tw`mb-4 text-4xl`}>Calendar and alarms</Text>
			<Button
				title="Add alarm for 09:00"
				onPress={async () => {
					console.log("adding alarm")

					const shortcutURL = "https://www.icloud.com/shortcuts/db6fa31331b64a63b8b64c723607769e"
					try {
						await openURL(shortcutURL)
						console.log("Shortcut opened successfully")
					} catch (err) {
						console.error("Failed to open shortcut", err)
					}
				}}
			/>
		</Screen>
	)
}
