import { ClassName } from "@/types"
import { cn } from "@/utils/twHelpers"
import { PropsWithChildren } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export interface ScreenProps extends ClassName {}

export function Screen({ children, className }: PropsWithChildren<ScreenProps>) {
	const saInsets = useSafeAreaInsets()

	return (
		<View
			style={{ paddingTop: saInsets.top, paddingBottom: saInsets.bottom }}
			className={cn("flex-1 bg-background", className)}
		>
			{children}
		</View>
	)
}
