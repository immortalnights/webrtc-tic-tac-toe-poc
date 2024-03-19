import "./App.css"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"

export const MainMenu = ({
    onPlay,
    onMultiplayer: onMultiplayer,
}: {
    onPlay: () => void
    onMultiplayer: () => void
}) => {
    const { status } = useWebSocket()

    return (
        <>
            <h3>Main Menu ({status})</h3>

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
