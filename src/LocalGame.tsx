import { useWebSocket } from "./multiplayer-lib/useWebSocket"

export const LocalGame = ({ onLeave }: { onLeave: () => void }) => {
    const { status } = useWebSocket()

    return (
        <div>
            <div>Local Game ({status})</div>
            <div>
                <button onClick={onLeave}>Leave</button>
            </div>
        </div>
    )
}
