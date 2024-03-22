import { useEffect, useState, useCallback } from "react"
import "./App.css"
import { useWebSocket } from "./multiplayer-lib/useWebSocket"
import { WebSocketProvider } from "./multiplayer-lib/WebSocketProvider"
import { MainMenu } from "./MainMenu"
import { useLobby } from "./multiplayer-lib/useLobby"
import {
    PlayerRecord,
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
    RoomRecord,
    RoomState,
} from "game-signaling-server"
import { LobbyProvider } from "./multiplayer-lib/LobbyProvider"
import { RTCConnectionProvider } from "./multiplayer-lib/RTCConnectionProvider"
import PeerConnectionProvider from "./PeerConnectionContext"
import { usePeerConnection } from "./usePeerConnection"

type State = "main-menu" | "lobby" | "in-game"

export const LobbyRoomItem = ({
    record,
    onJoin,
}: {
    record: RoomRecord
    onJoin: (room: RoomRecord) => void
}) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
            }}
        >
            <div>{record.name}</div>
            <div>{record.players.length}</div>
            <div>
                {record.state === RoomState.Open ? (
                    <button onClick={() => onJoin(record)}>Join</button>
                ) : null}
            </div>
        </div>
    )
}

const PeerConnectionStatus = ({
    localPlayer,
    remotePlayerId,
}: {
    localPlayer: PlayerRecord
    remotePlayerId: string
}) => {
    const { connections } = usePeerConnection()

    let content
    if (localPlayer.id === remotePlayerId) {
        content = "-"
    } else {
        const connection = localPlayer.host
            ? connections[remotePlayerId]
            : connections["host"]

        if (!connection) {
            content = "Not Found"
        } else {
            content = `Status: ${connection.status}`
        }
    }

    return content
}

export const LobbyRoom = ({
    localPlayerId,
    room: initialRoom,
    onStart,
    onLeave,
}: {
    localPlayerId: string
    room: RoomRecord
    onStart: () => void
    onLeave: () => void
}) => {
    const { subscribe, unsubscribe, send, sendWithReply } = useWebSocket()
    const { offer, reply, answer, close } = usePeerConnection()
    const [room, setRoom] = useState<RoomRecord>(initialRoom)

    const localPlayer = room.players.find((item) => item.id === localPlayerId)

    const handlePlayerConnected = useCallback(
        async (otherPlayer: PlayerRecord) => {
            console.debug(`Player joined room ${otherPlayer.id}`)
            setRoom((state) => ({
                ...state,
                players: [...state.players, otherPlayer],
            }))

            if (localPlayer?.host) {
                const { offer: sessionDescription, candidates } = await offer(
                    otherPlayer.id,
                )
                send("player-connect-to-peer", {
                    peer: otherPlayer.id,
                    offer: sessionDescription,
                    candidates,
                })
            }
        },
        [localPlayer?.host, offer, send],
    )

    const handlePlayerDisconnected = useCallback(
        (otherPlayer: Pick<PlayerRecord, "id" | "name">) => {
            console.debug(`Player disconnected ${otherPlayer.id}`)
            close(otherPlayer.id)
            setRoom((state) => ({
                ...state,
                players: state.players.filter(
                    (item) => item.id !== otherPlayer.id,
                ),
            }))
        },
        [close],
    )

    const handlePlayerReadyChange = useCallback(
        (otherPlayer: Pick<PlayerRecord, "id" | "ready">) => {
            setRoom((state) => {
                const playerRecord = state.players.find(
                    (item) => item.id === otherPlayer.id,
                )

                let newState
                if (playerRecord) {
                    const index = state.players.indexOf(playerRecord)
                    newState = { ...state, players: [...state.players] }
                    newState.players[index] = {
                        ...newState.players[index],
                        ready: otherPlayer.ready,
                    }
                } else {
                    newState = state
                }
                return newState
            })
        },
        [],
    )

    const handleStartGame = useCallback(() => {}, [])

    const handleRoomClosed = useCallback(() => {}, [])

    const handleConnectToHost = useCallback(
        async ({
            id,
            sessionDescription,
            candidates,
        }: {
            id: string
            sessionDescription: RTCSessionDescriptionLike
            candidates: RTCIceCandidateLike[]
        }) => {
            console.debug(`Connect to host (${id})`)
            const answerSessionDescription = await answer(
                sessionDescription,
                candidates,
            )
            send("player-connect-to-host", {
                answer: answerSessionDescription,
            })
        },
        [answer, send],
    )

    const handleConnectToPeerReply = useCallback(
        async ({
            id,
            sessionDescription,
        }: {
            id: string
            sessionDescription: RTCSessionDescriptionLike
        }) => {
            console.debug(`Connect to peer reply (${id})`)
            await reply(id, sessionDescription)
        },
        [reply],
    )

    useEffect(() => {
        console.debug("!Subscribe")
        const subscriptions = {
            "room-player-connected": handlePlayerConnected,
            "room-player-disconnected": handlePlayerDisconnected,
            "room-player-ready-change": handlePlayerReadyChange,
            "room-start-game": handleStartGame,
            "room-closed": handleRoomClosed,
            "room-player-rtc-host-offer": handleConnectToHost,
            "room-player-rtc-answer": handleConnectToPeerReply,
        }

        Object.entries(subscriptions).forEach(([name, callback]) => {
            subscribe(name, callback)
        })

        return () => {
            console.debug("!Unsubscribe")

            Object.entries(subscriptions).forEach(([name, callback]) => {
                unsubscribe(name, callback)
            })
        }
    }, [
        subscribe,
        unsubscribe,
        handlePlayerConnected,
        handlePlayerDisconnected,
        handlePlayerReadyChange,
        handleStartGame,
        handleRoomClosed,
        handleConnectToHost,
        handleConnectToPeerReply,
    ])

    const handleToggleReady = useCallback(() => {
        send("player-change-ready-state", {
            id: localPlayer?.id,
            ready: !localPlayer?.ready,
        })
    }, [send, localPlayer])

    return (
        <div>
            <div>Room {room.name}</div>
            <div>
                {room.players.map((player) => (
                    <div
                        key={player.id}
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <div>{player.ready ? "Ready" : "Not Ready"}</div>
                        <div style={{ flexGrow: 1 }}>{player.name}</div>
                        <div>
                            <PeerConnectionStatus
                                localPlayer={localPlayer}
                                remotePlayerId={player.id}
                            />
                        </div>
                        <div>
                            {localPlayer?.id === player.id ? (
                                <input
                                    type="checkbox"
                                    title="Toggle ready"
                                    aria-label={
                                        player.ready
                                            ? "Set ready"
                                            : "Set not ready"
                                    }
                                    onChange={handleToggleReady}
                                />
                            ) : (
                                ""
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div>
                <button onClick={onLeave}>Leave</button>
                {localPlayer?.host && <button>Start</button>}
            </div>
        </div>
    )
}

const Lobby = ({
    onJoin,
    onLeave,
}: {
    onJoin: (room: RoomRecord) => void
    onLeave: () => void
}) => {
    const { sendWithReply, subscribe, unsubscribe } = useWebSocket()
    const { host, join } = useLobby()
    const [players, setPlayers] = useState<PlayerRecord[]>([])
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    const handlePlayerConnected = useCallback((otherPlayer: PlayerRecord) => {
        console.debug(`Player ${otherPlayer.name} connected to lobby`)
    }, [])

    const handlePlayerDisconnected = useCallback(
        (otherPlayer: PlayerRecord) => {
            console.debug(`Player ${otherPlayer.name} disconnected from lobby`)
        },
        [],
    )

    const handleRoomCreated = useCallback((room: RoomRecord) => {
        console.debug(`Room created ${room.id}`)
        setRooms((state) => {
            let newState = state
            if (!state.find((r) => r.id === room.id)) {
                newState = [...state, room]
            }
            return newState
        })
    }, [])

    const handleRoomDeleted = useCallback((room: RoomRecord) => {
        console.debug(`Room deleted ${room.id}`)
        setRooms((state) => state.filter((item) => item.id !== room.id))
    }, [])

    useEffect(() => {
        sendWithReply(
            "player-list-players",
            { name },
            "player-list-players-reply",
        ).then((data: object | undefined) => {
            // setPlayers(data as unknown as PlayerRecord[])
        })

        sendWithReply(
            "player-list-games",
            { name },
            "player-list-games-reply",
        ).then((data: object | undefined) => {
            console.log("Got games: ", data.games)
            setRooms(data.games as unknown as RoomRecord[])
        })
    }, [sendWithReply])

    useEffect(() => {
        const subscriptions = {
            "lobby-player-connected": handlePlayerConnected,
            "lobby-player-disconnected": handlePlayerDisconnected,
            "lobby-room-created": handleRoomCreated,
            "lobby-room-deleted": handleRoomDeleted,
        }

        Object.entries(subscriptions).forEach(([name, callback]) => {
            subscribe(name, callback)
        })

        return () => {
            Object.entries(subscriptions).forEach(([name, callback]) => {
                unsubscribe(name, callback)
            })
        }
    }, [
        subscribe,
        unsubscribe,
        handlePlayerConnected,
        handlePlayerDisconnected,
        handleRoomCreated,
        handleRoomDeleted,
    ])

    const handleHost = async () => {
        const newRoom = await host("MyGame", {})
        onJoin(newRoom)
    }

    const handleJoin = async (room: RoomRecord) => {
        const newRoom = await join(room)
        onJoin(newRoom)
    }

    return (
        <div>
            <div>
                {rooms.map((room) => (
                    <LobbyRoomItem
                        key={room.id}
                        record={room}
                        onJoin={handleJoin}
                    />
                ))}
            </div>
            <div>
                <button onClick={handleHost}>Host</button>
                <button onClick={onLeave}>Leave</button>
            </div>
        </div>
    )
}

const LobbyCore = ({ onLeave }: { onLeave: () => void }) => {
    const { player: localPlayer } = useLobby()
    const [room, setRoom] = useState<RoomRecord | undefined>(undefined)

    console.debug("LobbyCore.render", room)

    const onStart = () => {
        console.log("START!?")
    }

    let content
    if (room) {
        content = (
            <LobbyRoom
                localPlayerId={localPlayer!.id}
                room={room}
                onStart={onStart}
                onLeave={onLeave}
            />
        )
    } else {
        content = (
            <Lobby
                onJoin={(room: RoomRecord) => setRoom(room)}
                onLeave={onLeave}
            />
        )
    }

    return content
}

const LobbyRoot = ({ onLeave }: { onLeave: () => void }) => {
    // const { status: socketStatus } = useWebSocket()
    const { status, connect, disconnect } = useLobby()

    console.debug("Lobby.render", status)

    useEffect(() => {
        if (status === "disconnected") {
            connect()
        }
    }, [status, connect, disconnect])

    const handleLeave = useCallback(() => {
        disconnect()
        onLeave()
    }, [disconnect, onLeave])

    let content
    if (status === "connected") {
        content = <LobbyCore onLeave={handleLeave} />
    } else if (status === "connecting") {
        content = <div>Connecting</div>
    } else if (status === "disconnected") {
        content = <div>Disconnected</div>
    }

    return content
}

function App() {
    const { status } = useWebSocket()
    const [state, setState] = useState<State>("main-menu")

    console.debug("App.render")

    useEffect(() => {
        if (status === "disconnected") {
            setState("main-menu")
        }
    }, [status])

    const handleJoinLobby = () => {
        setState("lobby")
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
                    <LobbyRoot onLeave={() => setState("main-menu")} />
                </LobbyProvider>
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
        <WebSocketProvider>
            <PeerConnectionProvider>
                <App />
            </PeerConnectionProvider>
        </WebSocketProvider>
    )
}

export default Root
