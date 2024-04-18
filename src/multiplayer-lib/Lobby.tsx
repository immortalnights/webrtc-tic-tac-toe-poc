import {
    RoomRecord,
    RoomState,
    PlayerRecord,
    GameOptions,
    throwError,
} from "game-signaling-server"
import { useState, useCallback, useEffect } from "react"
import { useManager } from "./useManager"
import { useWebSocket } from "./WebSocket"
import { LobbyRoom } from "./LobbyRoom"
import { WebSocketMessageHandler } from "./WebSocket/types"

const LobbyRoomItem = ({
    room,
    onJoin,
}: {
    room: RoomRecord
    onJoin: (room: RoomRecord) => void
}) => {
    const canJoin =
        room.state === RoomState.Open &&
        room.players.length < room.options.maxPlayers

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
            }}
        >
            <div style={{ flexGrow: 1, textAlign: "left" }}>{room.name}</div>
            <div>Players: {room.players.length}</div>
            <div>
                <button onClick={() => onJoin(room)} disabled={!canJoin}>
                    Join
                </button>
            </div>
        </div>
    )
}

const Lobby = () => {
    const { joinRoom, leaveLobby } = useManager()
    const { send, sendWithReply, subscribe, unsubscribe } = useWebSocket()
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    const handleHost = useCallback(
        async (
            name: string = "MyGame",
            options: GameOptions = { maxPlayers: 4 },
        ) => {
            const sessionDescription = undefined
            const iceCandidates: unknown[] = []

            const reply = sendWithReply(
                "player-host-game",
                {
                    name,
                    options,
                    sessionDescription,
                    iceCandidates,
                    autoReady: true,
                },
                "player-host-game-reply",
            )

            reply.then((reply) => {
                const room =
                    reply && "id" in reply
                        ? (reply as RoomRecord)
                        : throwError("Failed to receive room from reply")

                joinRoom(room, true)
            })

            return reply
        },
        [sendWithReply, joinRoom],
    )

    const handleJoin = useCallback(
        async (room: RoomRecord) => {
            const reply = sendWithReply(
                "player-join-room",
                {
                    room: room.id,
                    autoReady: true,
                },
                "player-join-room-reply",
            )

            reply.then((reply) => {
                const room =
                    reply && "id" in reply
                        ? (reply as RoomRecord)
                        : throwError("Failed to receive room from reply")

                joinRoom(room, false)
            })

            return reply
        },
        [sendWithReply, joinRoom],
    )

    const handleLeave = useCallback(() => {
        send("player-leave-lobby", undefined)
        leaveLobby()
    }, [send, leaveLobby])

    useEffect(() => {
        const handlePlayerConnected = (otherPlayer: PlayerRecord) => {
            console.debug(`Player ${otherPlayer.name} connected to lobby`)
        }

        const handlePlayerDisconnected = (otherPlayer: PlayerRecord) => {
            console.debug(`Player ${otherPlayer.name} disconnected from lobby`)
        }

        const handleRoomCreated = (room: RoomRecord) => {
            console.debug(`Room created ${room.id}`)
            setRooms((state) => {
                let newState = state
                if (!state.find((r) => r.id === room.id)) {
                    newState = [...state, room]
                }
                return newState
            })
        }

        const handleRoomDeleted = (room: RoomRecord) => {
            console.debug(`Room deleted ${room.id}`)
            setRooms((state) => state.filter((item) => item.id !== room.id))
        }

        const subscriptions = {
            "lobby-player-connected": handlePlayerConnected,
            "lobby-player-disconnected": handlePlayerDisconnected,
            "lobby-room-created": handleRoomCreated,
            "lobby-room-deleted": handleRoomDeleted,
        }

        sendWithReply(
            "player-list-players",
            { name },
            "player-list-players-reply",
        ).then((data: object | undefined) => {
            // setPlayers(data as unknown as PlayerRecord[])
        })

        sendWithReply(
            "player-list-rooms",
            { name },
            "player-list-rooms-reply",
        ).then((data: object | undefined) => {
            if (data && "rooms" in data) {
                console.log("Got rooms: ", data.rooms)
                setRooms(data.rooms as unknown as RoomRecord[])
            }
        })

        const handleSocketMessage: WebSocketMessageHandler = ({
            name,
            body,
        }) => {
            if (Object.keys(subscriptions).includes(name)) {
                const key = name as keyof typeof subscriptions
                subscriptions[key](body as never)
            }
        }

        subscribe(handleSocketMessage)

        return () => {
            unsubscribe(handleSocketMessage)
        }
    }, [sendWithReply, subscribe, unsubscribe])

    return (
        <div>
            <div
                style={{
                    minWidth: 400,
                    minHeight: 200,
                    borderWidth: 1,
                    borderStyle: "solid none",
                    borderColor: "lightgray",
                }}
            >
                {rooms.map((room) => (
                    <LobbyRoomItem
                        key={room.id}
                        room={room}
                        onJoin={handleJoin}
                    />
                ))}

                {rooms.length === 0 && <div>No games</div>}
            </div>
            <div>
                <button onClick={() => handleHost()}>Host</button>
                <button onClick={handleLeave}>Leave</button>
            </div>
        </div>
    )
}

export const LobbyRoot = () => {
    const { state } = useWebSocket()
    const { player: localPlayer, room, leaveLobby } = useManager()
    console.debug("Lobby.render", status, room)

    useEffect(() => {
        if (state === "disconnected") {
            leaveLobby()
        }
    }, [state, leaveLobby])

    let content
    if (room) {
        content = <LobbyRoom localPlayerId={localPlayer!.id} room={room} />
    } else {
        content = <Lobby />
    }

    return content
}
