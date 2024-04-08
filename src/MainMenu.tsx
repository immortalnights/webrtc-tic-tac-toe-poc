import "./App.css"
import { useWebSocket } from "./multiplayer-lib/WebSocket"

export const MainMenu = ({
    onPlay,
    onMultiplayer: onMultiplayer,
}: {
    onPlay: () => void
    onMultiplayer: () => void
}) => {
    const { state } = useWebSocket()

    return (
        <>
            <h3>Main Menu ({state})</h3>

            <div
                style={{
                    display: "flex",
                    gap: "1em",
                    flexDirection: "column",
                }}
            >
                <button onClick={onPlay}>Play</button>
                <button onClick={onMultiplayer}>Multiplayer</button>
            </div>
        </>
    )
}
