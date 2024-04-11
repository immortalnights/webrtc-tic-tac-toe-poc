import { useEffect } from "react"
import "./App.css"
import { useWebSocket } from "./multiplayer-lib/WebSocket"
import { MainMenu } from "./MainMenu"
import {
    RootProvider,
    WebSocketConnectionState,
    useManager,
    LobbyProvider,
    Lobby,
} from "./multiplayer-lib"
import { LocalGame } from "./LocalGame"

function App() {
    const {
        state,
        leaveLobby,
        joinLobby: handleJoinLobby,
        leaveGame,
    } = useManager()
    const { state: webSocketState } = useWebSocket()
    console.debug("App.render", state, webSocketState)

    let content
    switch (state) {
        case "main-menu":
            content = (
                <MainMenu onPlay={() => {}} onMultiplayer={handleJoinLobby} />
            )
            break
        case "lobby":
            content = (
                <LobbyProvider>
                    <Lobby />
                </LobbyProvider>
            )
            break
        case "in-game":
            content = <LocalGame onLeave={leaveGame} />
            break
        default:
            break
    }

    return (
        <div>
            <h2>Tic-tac-toe</h2>

            {content}

            <div style={{ marginTop: "20px" }}>
                <small>
                    <WebSocketConnectionState />
                </small>
            </div>
        </div>
    )
}

const Root = () => {
    return (
        <RootProvider>
            <App />
        </RootProvider>
    )
}

export default Root
