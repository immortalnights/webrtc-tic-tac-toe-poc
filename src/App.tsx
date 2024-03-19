import { useEffect, useState, useCallback } from "react"
import "./App.css"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"
import { WebSocketContextProvider } from "./multiplayer-lib/WebSocketProvider"
import { LobbyRoom, LobbyRoomItem, LobbyWithConnector } from "./Lobby"
import { MainMenu } from "./MainMenu"
import { useLobby } from "./multiplayer-lib/useLobby"
import { RoomRecord } from "game-signaling-server"

type State = "main-menu" | "lobby" | "in-game"

const Lobby = ({ onLeave }: { onLeave: () => void }) => {
    const { status } = useWebSocket()
    const { host, join, rooms } = useLobby()
    const [room, setRoom] = useState<RoomRecord | undefined>(undefined)

    // why do you not have the rooms!?
    console.debug("Lobby.render", rooms)

    const handleHost = async () => {
        const newRoom = await host("MyGame", {})
        setRoom(newRoom)
    }

    const handleJoin = async (room: RoomRecord) => {
        const newRoom = await join(room)
        setRoom(newRoom)
    }

    let content
    if (status === "connected") {
        if (room) {
            content = <LobbyRoom room={room} />
        } else {
            content = (
                <div>
                    <div>
                        {rooms.map((room) => (
                            <LobbyRoomItem record={room} onJoin={handleJoin} />
                        ))}
                    </div>
                    <div>
                        <button onClick={handleHost}>Host</button>
                    </div>
                </div>
            )
        }
    } else if (status === "connecting") {
        content = <div>Connecting</div>
    } else if (status === "disconnected") {
        content = <div>Disconnected</div>
    }

    return content
}

const LobbyConnector = ({ onLeave }: { onLeave: () => void }) => {
    let content
    switch (status) {
        case "connected":
            content = (
                <div>
                    Connected
                    <Lobby onLeave={onLeave} />
                </div>
            )
            break
        case "connecting":
            content = <div>Connecting</div>
            break
        case "disconnected":
            content = <div>Disconnected</div>
            break
        default:
            content = <div>Unknown Error</div>
            break
    }
    return content
}

function App() {
    const [state, setState] = useState<State>("main-menu")
    const { status: socketStatus } = useWebSocket()
    const { connect, disconnect } = useLobby()

    console.debug("App.render")

    useEffect(() => {
        if (socketStatus === "disconnected") {
            setState("main-menu")
            disconnect()
        }
    }, [socketStatus, disconnect])

    const handleJoinLobby = useCallback(async () => {
        if (socketStatus === "disconnected") {
            connect()
        }
        setState("lobby")
    }, [socketStatus, connect])

    let content
    switch (state) {
        case "main-menu":
            content = (
                <MainMenu onPlay={() => {}} onMultiplayer={handleJoinLobby} />
            )
            break
        case "lobby":
            // onStart // onLeave
            content = (
                <Lobby onLeave={() => setState("main-menu")} />
                // <LobbyWithConnector
                //     onEnterRoom={() => setState("lobby-room")}
                //     onLeave={() => {
                //         console.debug("leaving lobby")
                //         setState("main-menu")
                //     }}
                // />
            )
            break
        case "in-game":
            content = <LocalGame onLeave={() => setState("main-menu")} />
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

const ServerStatus = () => {
    const { status, connect, disconnect } = useWebSocket()

    let content
    if (status === "connected") {
        content = (
            <div>
                Connected to multiplayer server{" "}
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        )
    } else if (status === "connecting") {
        content = <div>Connecting to multiplayer server...</div>
    } else if (status === "disconnected") {
        content = (
            <div>
                Not connected to multiplayer server{" "}
                <button onClick={() => connect()}>Connect</button>
            </div>
        )
    }

    return content
}

const Root = () => {
    return (
        <WebSocketContextProvider>
            <App />
        </WebSocketContextProvider>
    )
}

export default Root
