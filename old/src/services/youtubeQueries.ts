import { youtubeClient } from "./youtube"

export function getPlaylists() {
	return youtubeClient.get("/playlists")
}
