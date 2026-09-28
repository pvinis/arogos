import { useQuery } from "@tanstack/react-query"
import { getPlaylists } from "./youtubeQueries"

export function usePlaylists({ enabled }) {
	const queryHook = useQuery({
		queryKey: ["playlists"],
		queryFn: getPlaylists,
		enabled,
	})
	return queryHook
}
