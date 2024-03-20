import { useContext } from "react"
import { LobbyContext } from "./LobbyProvider"

export const useLobby = () => useContext(LobbyContext)
