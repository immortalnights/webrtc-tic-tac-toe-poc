import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { PlayerRecord, RoomRecord, throwError } from "game-signaling-server"
import SignalingServerContextProvider, {
    SignalingServerContext,
} from "./SignalingServerContext"
import PeerConnectionContextProvider, {
    PeerConnectionContext,
} from "./PeerConnectionContext"

const GameList = ({
    selected,
    onSelect,
}: {
    selected: RoomRecord | null
    onSelect: (room: RoomRecord) => void
}) => {
    const [rooms, setRooms] = useState<RoomRecord[]>([])
    const { subscribe, unsubscribe, getGames } = useContext(
        SignalingServerContext,
    )

    const handleRoomCreated = (room: RoomRecord) => {
        console.debug("Room created", room)
        setRooms((state) => [...state, room])
    }

    const handleRoomDeleted = (room: Pick<RoomRecord, "id">) => {
        if (!setRooms) {
            throw new Error("")
        }

        console.debug("Room deleted", room)
        setRooms((state: RoomRecord[]) => {
            const index = state.findIndex((r) => r.id === room.id)

            if (index !== -1) {
                state.splice(index, 1)
            }

            return [...state]
        })
    }

    useEffect(() => {
        subscribe("lobby-room-created", handleRoomCreated)
        subscribe("lobby-room-deleted", handleRoomDeleted)

        return () => {
            unsubscribe("lobby-room-created")
            unsubscribe("lobby-room-deleted")
        }
    }, [subscribe, unsubscribe])

    // Must request game list on first load
    useEffect(() => {
        getGames().then((resp) => {
            setRooms(resp.games)
        })
    }, [getGames])

    return (
        <div style={{}}>
            {rooms.length > 0
                ? rooms.map((room) => (
                      <div
                          key={room.id}
                          style={{
                              borderStyle: "solid",
                              borderColor: selected ? "#646cff" : "black",
                              borderWidth: "1px",
                          }}
                          onClick={() => onSelect(room)}
                      >
                          {room.name}
                      </div>
                  ))
                : "No rooms"}
        </div>
    )
}

const LobbyRoot = ({
    onHost,
    onJoin,
    onLeave,
}: {
    onHost: () => void
    onJoin: (room: RoomRecord) => void
    onLeave: () => void
}) => {
    const [selected, setSelected] = useState<RoomRecord | null>(null)

    const handleSelect = (room: RoomRecord) => {
        setSelected(room)
    }

    const handleJoin = () => {
        if (!selected) {
            throw new Error("")
        }

        onJoin(selected)
    }

    return (
        <>
            <h3>Lobby</h3>
            <div>Available Games</div>
            <GameList selected={selected} onSelect={handleSelect} />
            <hr />
            <div
                style={{
                    display: "flex",
                    gap: "1em",
                    flexDirection: "row",
                }}
            >
                <button onClick={onHost}>Host</button>
                <button disabled={!selected} onClick={handleJoin}>
                    Join
                </button>
                |<button onClick={onLeave}>Leave</button>
            </div>
        </>
    )
}

type LobbyState = "browser" | "hosting" | "joining" | "in-room" | "in-game"

const Room = ({
    player,
    room,
    onStart,
    onLeave,
}: {
    player: PlayerRecord
    room: RoomRecord
    onStart: () => void
    onLeave: () => void
}) => {
    const { subscribe, unsubscribe, setReady, start, leave } = useContext(
        SignalingServerContext,
    )
    const { connected, response } = useContext(PeerConnectionContext)
    const [players, setPlayers] = useState<PlayerRecord[]>([...room.players])

    const localPlayer =
        players.find((p) => p.id === player.id) ??
        throwError("Failed to find local player")

    const handlePlayerConnected = useCallback(
        async (otherPlayer: PlayerRecord) => {
            console.log("Player connected", otherPlayer.name)

            if (player?.host) {
                if (!otherPlayer.sessionDescription) {
                    throw new Error(
                        "New player is missing response session description",
                    )
                }

                await response(otherPlayer.sessionDescription)
            }

            setPlayers((p) => [...p, otherPlayer])
        },
        [player, response],
    )

    const handlePlayerDisconnected = useCallback(
        async (otherPlayer: Pick<PlayerRecord, "id">) => {
            console.log(
                "Player disconnected",
                otherPlayer?.id,
                "players",
                players.length,
            )

            const index = players.findIndex((p) => p.id === otherPlayer?.id)
            if (index !== -1) {
                setPlayers((p) => {
                    const removed = p.splice(index, 1)
                    console.debug("Removed", removed)
                    return [...p]
                })
            }
        },
        [players],
    )

    const handlePlayerReadyChanged = useCallback(
        async (otherPlayer: Pick<PlayerRecord, "id" | "ready">) => {
            const index = players.findIndex((p) => p.id === otherPlayer?.id)
            if (index !== -1) {
                setPlayers((p) => {
                    const clone = [...p]
                    clone[index] = { ...clone[index], ready: otherPlayer.ready }
                    return clone
                })
            }
        },
        [players],
    )

    const handleStartGame = useCallback(async () => {
        // TODO Host has started the game
    }, [])

    const handleRoomClosed = useCallback(async () => {
        // Host has closed the game
        onLeave()
    }, [onLeave])

    useEffect(() => {
        subscribe("room-player-connected", handlePlayerConnected)
        subscribe("room-player-disconnected", handlePlayerDisconnected)
        subscribe("room-player-ready-change", handlePlayerReadyChanged)
        subscribe("room-start-game", handleStartGame)
        subscribe("room-closed", handleRoomClosed)

        return () => {
            unsubscribe("room-player-connected", handlePlayerConnected)
            unsubscribe("room-player-disconnected", handlePlayerDisconnected)
            unsubscribe("room-player-ready-change", handlePlayerReadyChanged)
            unsubscribe("room-start-game", handleStartGame)
            unsubscribe("room-closed", handleRoomClosed)
        }
    }, [
        subscribe,
        unsubscribe,
        handlePlayerConnected,
        handlePlayerDisconnected,
        handlePlayerReadyChanged,
        handleStartGame,
        handleRoomClosed,
    ])

    const handleLeave = () => {
        leave()
        onLeave()
    }

    const handleToggleReady = () => {
        setReady(localPlayer.id, !localPlayer.ready)
    }

    const handleStart = () => {
        start(localPlayer.id)
        onStart()
    }

    return (
        <>
            <div>Room {room.name}</div>
            <div>Peer {connected ? "connected" : "disconnected"}</div>
            <div>
                {players.map((p) => (
                    <div key={p.id}>
                        {p.name} | {p.ready ? "Ready" : "Not Ready"}
                    </div>
                ))}
            </div>
            <div>
                <button onClick={handleLeave}>Leave</button>|
                <button onClick={handleToggleReady}>Ready</button>
                {player.host && (
                    <button
                        disabled={!players.every((p) => p.ready)}
                        onClick={handleStart}
                    >
                        Start
                    </button>
                )}
            </div>
        </>
    )
}

// const RoomRoot = ({
//     id,
//     name,
//     onLeave,
// }: RoomRecord & { onLeave: () => void }) => {
//     const { player, join, subscribe } = useContext(SignalingServerContext)
//     const [room, setRoom] = useState<RoomRecord | null>(null)

//     useEffect(() => {
//         join(room).then(
//             (inRoom: RoomRecord) => {
//                 setRoom(room)
//             },
//             (err) => {
//                 console.error("Failed to join game", err)
//                 onLeave()
//             },
//         )
//     }, [id])

//     useEffect(() => {
//         join(room).then(
//             (inRoom: RoomRecord) => {
//                 setRoom(room)
//             },
//             (err) => {
//                 console.error("Failed to join game", err)
//                 onLeave()
//             },
//         )
//     }, [id])

//     useEffect(() => {
//         subscribe({
//             "room-player-connected": () => {},
//             "room-player-disconnected": () => {},
//             "room-player-ready-change": () => {},
//             "room-start-game": () => {},
//             "room-closed": () => {},
//         })

//         return () => {
//             // unsubscribe
//         }
//     }, [subscribe])

//     let content
//     if (room) {
//         content = <Room room={room} />
//     } else {
//         content = <div>Joining...</div>
//     }

//     return content
// }

const Lobby = ({
    player: initialPlayer,
    onStart,
    onLeave,
}: {
    player: { id: string; name: string }
    onStart: () => void
    onLeave: () => void
}) => {
    const { host, join, exit } = useContext(SignalingServerContext)
    const [player, setPlayer] = useState<PlayerRecord>({
        ...initialPlayer,
        host: false,
        ready: false,
    })
    const [state, setState] = useState<LobbyState>("browser")
    const [room, setRoom] = useState<RoomRecord | null>(null)

    const handleStart = () => {
        onStart()
    }

    const handleHost = async () => {
        setState("in-room")

        host("My Game", { maxPlayers: 4 }).then(
            (room: RoomRecord) => {
                setState("in-room")
                setPlayer((p) => ({ ...p, host: true }))
                setRoom(room)
            },
            (err) => {
                console.error("Failed to host game", err)
                setState("browser")
            },
        )
    }

    const handleJoin = async (room: RoomRecord) => {
        setState("in-room")

        join(room).then(
            (inRoom: RoomRecord) => {
                setState("in-room")
                setRoom(inRoom)
            },
            (err) => {
                console.error("Failed to join game", err)
                setState("browser")
            },
        )
    }

    const handleLeave = () => {
        exit()
        onLeave()
    }

    let content
    switch (state) {
        case "browser":
            content = (
                <LobbyRoot
                    onHost={handleHost}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                />
            )
            break
        case "hosting":
            content = <div>Creating...</div>
            break
        case "joining":
            content = <div>Joining...</div>
            break
        case "in-room":
            if (room) {
                content = (
                    <Room
                        player={player}
                        room={room}
                        onStart={handleStart}
                        onLeave={() => {
                            setState("browser")
                            setRoom(null)
                        }}
                    />
                )
            } else {
                setState("browser")
            }
            break

        default:
            break
    }

    return content
}

const LobbyContainer = ({
    onStart,
    onLeave,
}: {
    onStart: () => void
    onLeave: () => void
}) => {
    const { connected, connect, disconnect } = useContext(
        SignalingServerContext,
    )
    const name = useMemo(
        () => `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`,
        [],
    )
    const [playerId, setPlayerId] = useState("")

    useEffect(() => {
        const connectToLobby = async () => {
            try {
                const serverPlayer = await connect(name)

                setPlayerId(serverPlayer.id)
            } catch (err) {
                // FIXME fix dev abort connection
                console.warn("Failed to connect")
            }
        }

        connectToLobby()

        return () => {
            disconnect()
        }
    }, [name, connect, disconnect])

    return connected ? (
        <Lobby
            player={{ id: playerId, name }}
            onStart={onStart}
            onLeave={onLeave}
        />
    ) : (
        <div>Connecting...</div>
    )
}

const LobbyBase = ({
    onStart,
    onLeave,
}: {
    onStart: () => void
    onLeave: () => void
}) => {
    return (
        <PeerConnectionContextProvider>
            <SignalingServerContextProvider>
                <LobbyContainer onStart={onStart} onLeave={onLeave} />
            </SignalingServerContextProvider>
        </PeerConnectionContextProvider>
    )
}

export default LobbyBase
