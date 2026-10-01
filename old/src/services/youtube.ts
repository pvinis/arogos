import axios from "axios"

export const youtubeClient = axios.create({
	baseURL: "https://www.googleapis.com/youtube/v3/",
})
