import { PeerConnectionStatus } from "./multiplayer-lib"

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
