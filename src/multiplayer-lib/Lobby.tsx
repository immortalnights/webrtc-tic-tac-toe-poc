import { RoomRecord, RoomState, PlayerRecord } from "game-signaling-server"
import { useState, useCallback, useEffect } from "react"
import { useLobby } from "./useLobby"
import { useManager } from "./useManager"
import { useWebSocket } from "./useWebSocket"
import { LobbyRoom } from "./LobbyRoom"

const LobbyRoomItem = ({
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

const Lobby = ({
    onJoin,
    onLeave,
}: {
    onJoin: (room: RoomRecord) => void
    onLeave: () => void
}) => {
    const { sendWithReply, subscribe, unsubscribe } = useWebSocket()
    const { host, join } = useLobby()
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
        const newRoom = await host("MyGame", {
            maxPlayers: 4,
        })
        if (newRoom) {
            onJoin(newRoom)
        }
    }

    const handleJoin = async (room: RoomRecord) => {
        const newRoom = await join(room)
        if (newRoom) {
            onJoin(newRoom)
        }
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

const LobbyCore = () => {
    const { room, joinRoom, leaveLobby, leaveRoom } = useManager()
    const { player: localPlayer } = useManager()

    console.debug("LobbyCore.render", room)

    const handleJoin = (room: RoomRecord) => {
        joinRoom(room)
    }

    const handleLeaveRoom = () => {
        leaveRoom()
    }

    const handleLeaveLobby = () => {
        leaveLobby()
    }

    let content
    if (room) {
        content = (
            <LobbyRoom
                localPlayerId={localPlayer!.id}
                room={room}
                onLeave={handleLeaveRoom}
            />
        )
    } else {
        content = <Lobby onJoin={handleJoin} onLeave={handleLeaveLobby} />
    }

    return content
}

export const LobbyRoot = () => {
    const { status, connect, disconnect } = useLobby()

    console.debug("Lobby.render", status)

    useEffect(() => {
        if (status === "disconnected") {
            connect()
        }
    }, [status, connect, disconnect])

    let content
    if (status === "connected") {
        content = <LobbyCore />
    } else if (status === "connecting") {
        content = <div>Connecting</div>
    } else if (status === "disconnected") {
        content = <div>Disconnected</div>
    }

    return content
}
