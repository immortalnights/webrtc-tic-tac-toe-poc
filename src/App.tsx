import { useEffect } from "react"
import "./App.css"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"
import { MainMenu } from "./MainMenu"
import {
    RootProvider,
    useManager,
    ServerStatus,
    LobbyProvider,
    Lobby,
} from "./multiplayer-lib"
import { LocalGame } from "./LocalGame"

function App() {
    const { state, leaveLobby, joinLobby, leaveGame } = useManager()
    const { status } = useWebSocket()

    console.debug("App.render")

    useEffect(() => {
        if (status === "disconnected") {
            leaveLobby()
        }
    }, [status, leaveLobby])

    const handleJoinLobby = () => {
        joinLobby()
    }

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
                    <ServerStatus />
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
