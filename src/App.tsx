import { useEffect, useState, ComponentType, useCallback } from "react"
import "./App.css"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"
import { WebSocketContextProvider } from "./multiplayer-lib/WebSocketProvider"
import { useLobby } from "./multiplayer-lib/useLobby"

type State = "main-menu" | "lobby" | "in-game"

const LocalLobby = ({
    onStart,
    onLeave,
}: {
    onStart: () => void
    onLeave: () => void
}) => {
    const { player, host, join, leave } = useLobby()

    return (
        <div>
            <div>Local Lobby</div>
            <div>
                <small>
                    Player: {player.name} {player.id}
                </small>
            </div>
            <div>
                <button onClick={onLeave}>Leave</button>
                <button onClick={onStart}>Start</button>
            </div>
        </div>
    )
}

const withConnector = <TProps,>(WrappedComponent: ComponentType<TProps>) => {
    const WithConnector = (props: TProps) => {
        const { status } = useWebSocket()

        let content
        if (status === "connected") {
            content = <WrappedComponent {...(props as TProps)} />
        } else if (status === "connecting") {
            content = <div>Connecting...</div>
        } else if (status === "disconnected") {
            content = <div>Disconnected</div>
        }

        return content
    }

    return WithConnector
}

const LocalGame = ({ onLeave }: { onLeave: () => void }) => {
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

const MainMenu = ({
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

const LobbyWithConnector = withConnector(LocalLobby)

function App() {
    const [state, setState] = useState<State>("main-menu")
    const { status: socketStatus, connect, disconnect } = useWebSocket()

    useEffect(() => {
        // Disconnect on unmount
        return () => {
            if (socketStatus === "connected") {
                disconnect()
            }
        }
    }, [socketStatus, disconnect])

    const handleJoinLobby = useCallback(() => {
        if (socketStatus === "disconnected") {
            connect()
        }
        setState("lobby")
    }, [socketStatus, connect])

    useEffect(() => {
        if (state === "lobby" && socketStatus === "disconnected") {
            setState("main-menu")
        }
        // else if (state === "in-game" && peerStatus === "disconnected") {
        //     setState("main-menu")
        // }
    }, [state, socketStatus])

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
                <LobbyWithConnector
                    onStart={() => setState("in-game")}
                    onLeave={() => {
                        console.debug("leaving lobby")
                        setState("main-menu")
                    }}
                />
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
