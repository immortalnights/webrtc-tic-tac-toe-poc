import { usePeerConnection } from "./usePeerConnection"
import { useManager } from "../"

export const PeerConnectionStatus = ({
    remotePlayerId,
}: {
    remotePlayerId?: string
}) => {
    const { player: localPlayer } = useManager()
    const { connections } = usePeerConnection()

    let connection
    if (localPlayer && localPlayer.id !== remotePlayerId) {
        if (localPlayer.host) {
            if (remotePlayerId) {
                connection = connections[remotePlayerId]
            } else {
                const keys = Object.keys(connections)
                if (keys.length === 1) {
                    connection = connections[keys[0]]
                }
            }
        } else {
            connection = connections["host"]
        }
    }

    return connection?.status
}
