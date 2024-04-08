import { useContext } from "react"
import { PeerConnectionContext } from "./Provider"

export const usePeerConnection = () => {
    const context = useContext(PeerConnectionContext)
    if (!context) {
        throw new Error(
            "usePeerConnection must be used within a PeerConnectionContext",
        )
    }
    return context
}
