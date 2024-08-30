import "@/global.css"
import { Stack } from "expo-router"
import { Providers } from "@/utils/providers"
import { LogBox, View } from "react-native"
import { useSafeAreaEnv } from "react-native-css-interop/dist/runtime/api"

LogBox.ignoreLogs(["ExpandableCalendar"])

export default function RootLayout() {
	return (
		<Providers>
			<View style={[{ flex: 1 }, useSafeAreaEnv()]}>
				<Stack screenOptions={{ headerShown: false }} />
			</View>
		</Providers>
	)
}
