import { useContext } from "react"
import { LobbyContext } from "./LobbyProvider"

export const useLobby = () => {
    const context = useContext(LobbyContext)
    if (!context) {
        throw new Error("useLobby must be used within a LobbyContextProvider")
    }
    return context
}
