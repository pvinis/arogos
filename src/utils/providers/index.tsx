import { PropsWithChildren } from "react"
import { QueryClientProvider } from "./QueryClient"

export function Providers({ children }: PropsWithChildren) {
	return (
		<QueryClientProvider>
			{/**/}
			{children}
			{/**/}
		</QueryClientProvider>
	)
}
