import { Screen, Text } from "@/design-system"
import { usePlaylists } from "@/services/youtubeQueriesHooks"
import { Button } from "react-native"

export default function Index() {
	const { data, isLoading, refetch } = usePlaylists({
		enabled: false,
	})

	console.log({ data, isLoading })
	return (
		<Screen>
			<Text className="mb-4 text-4xl">Watch It</Text>
			<Button title="try" onPress={() => refetch()} />
		</Screen>
	)
}
