import { RoomRecord, RoomState, PlayerRecord } from "game-signaling-server"
import { useState, useCallback, useEffect, useSyncExternalStore } from "react"
import { useLobby } from "./useLobby"
import { useManager } from "./useManager"
import { useWebSocket } from "./WebSocket"
import { LobbyRoom } from "./LobbyRoom"

const LobbyRoomItem = ({
    room,
    onJoin,
}: {
    room: RoomRecord
    onJoin: (room: RoomRecord) => void
}) => {
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
                <button
                    onClick={() => onJoin(room)}
                    disabled={
                        room.state !== RoomState.Open &&
                        room.players.length >= room.options.maxPlayers
                    }
                >
                    Join
                </button>
            </div>
        </div>
    )
}

const useSyncLobby = () => {
    const {
        sendWithReply,
        subscribe: socketSubscribe,
        unsubscribe: socketUnsubscribe,
    } = useWebSocket()
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    const subscribe = useCallback(() => {
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
            "player-list-games",
            { name },
            "player-list-games-reply",
        ).then((data: object | undefined) => {
            console.log("Got games: ", data.games)
            setRooms(data.games as unknown as RoomRecord[])
        })

        // Object.entries(subscriptions).forEach(([name, callback]) => {
        //     socketSubscribe(callback)
        // })

        // return () => {
        //     Object.entries(subscriptions).forEach(([name, callback]) => {
        //         socketUnsubscribe(callback)
        //     })
        // }
    }, [sendWithReply, socketSubscribe, socketUnsubscribe])

    const getSnapshot = useCallback(() => rooms, [rooms])

    return useSyncExternalStore(subscribe, getSnapshot)
}

const Lobby = () => {
    const { joinRoom, leaveLobby } = useManager()
    const { host, join } = useLobby()
    const rooms = useSyncLobby()

    const handleHost = async () => {
        const newRoom = await host("MyGame", {
            maxPlayers: 4,
        })
        if (newRoom) {
            joinRoom(newRoom)
        }
    }

    const handleJoin = async (room: RoomRecord) => {
        const newRoom = await join(room)
        if (newRoom) {
            joinRoom(newRoom)
        }
    }

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
                <button onClick={handleHost}>Host</button>
                <button onClick={leaveLobby}>Leave</button>
            </div>
        </div>
    )
}

export const LobbyRoot = () => {
    const { state: socketState } = useWebSocket()
    const { player: localPlayer, room, leaveLobby } = useManager()
    const { status, connect, disconnect } = useLobby()
    console.debug("Lobby.render", status, room)

    useEffect(() => {
        if (status === "connected" && socketState === "disconnected") {
            leaveLobby()
        }
    }, [status, socketState, leaveLobby])

    let content
    if (status === "connected") {
        if (room) {
            content = <LobbyRoom localPlayerId={localPlayer!.id} room={room} />
        } else {
            content = <Lobby />
        }
    } else if (status === "connecting") {
        content = <div>Connecting</div>
    } else if (status === "disconnected") {
        content = <div>Disconnected</div>
    }

    return content
}
