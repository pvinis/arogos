import { Text, Screen } from "@/design-system"
import { tw } from "@/utils/twHelpers"

export default function Main() {
	return (
		<Screen>
			<Text style={tw`mb-4 text-4xl`}>Calendar and alarms</Text>
		</Screen>
	)
}
