import { PropsWithChildren } from "react"
import { QueryClient } from "./QueryClient"

export function Providers({ children }: PropsWithChildren) {
	return (
		<QueryClient>
			{/**/}
			{children}
			{/**/}
		</QueryClient>
	)
}
