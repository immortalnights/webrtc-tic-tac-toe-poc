import { PlayerRecord } from "game-signaling-server"
import { usePeerConnection } from "./usePeerConnection"

export const PeerConnectionStatus = ({
    localPlayer,
    remotePlayerId,
}: {
    localPlayer: PlayerRecord
    remotePlayerId: string
}) => {
    const { connections } = usePeerConnection()

    let content
    if (localPlayer.id === remotePlayerId) {
        content = "-"
    } else {
        const connection = localPlayer.host
            ? connections[remotePlayerId]
            : connections["host"]

        if (!connection) {
            content = "Not Found"
        } else {
            content = `Status: ${connection.status}`
        }
    }

    return content
}
