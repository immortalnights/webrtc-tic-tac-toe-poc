import { PeerConnectionStatus } from "./multiplayer-lib"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"

export const LocalGame = ({ onLeave }: { onLeave: () => void }) => {
    return (
        <div>
            <div>
                Local Game (<PeerConnectionStatus />)
            </div>
            <div>
                <button onClick={onLeave}>Leave</button>
            </div>
        </div>
    )
}
