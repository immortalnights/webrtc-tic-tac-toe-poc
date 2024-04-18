import "./App.css"
import { useManager } from "./multiplayer-lib"
import { useWebSocket } from "./multiplayer-lib/WebSocket"

export const MainMenu = () => {
    const { state } = useWebSocket()
    const { joinGame, joinLobby } = useManager()

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
                <button onClick={() => joinGame("local")}>Play</button>
                <button onClick={joinLobby}>Multiplayer</button>
            </div>
        </>
    )
}
