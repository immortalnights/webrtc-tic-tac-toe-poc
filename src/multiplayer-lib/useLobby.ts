import { useCallback, useEffect, useState } from "react"
import { useWebSocket } from "./useWebSocket"
import { GameOptions, PlayerRecord, RoomRecord } from "game-signaling-server"

export const useLobby = () => {
    const {
        status,
        connect: socketConnect,
        disconnect: socketDisconnect,
        subscribe,
        unsubscribe,
        send,
        sendWithReply,
    } = useWebSocket()
    const [player, setPlayer] = useState<PlayerRecord | null>(null)
    const [players, setPlayers] = useState<PlayerRecord[]>([])
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    console.log("useLobby.render", player, players, rooms)

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

    // useEffect(() => {
    //     subscribe("lobby-player-connected", handlePlayerConnected)
    //     subscribe("lobby-player-disconnected", handlePlayerDisconnected)
    //     subscribe("lobby-room-created", handleRoomCreated)
    //     subscribe("lobby-room-deleted", handleRoomDeleted)

    //     return () => {
    //         unsubscribe("lobby-player-connected", handlePlayerConnected)
    //         unsubscribe("lobby-player-disconnected", handlePlayerDisconnected)
    //         unsubscribe("lobby-room-created", handleRoomCreated)
    //         unsubscribe("lobby-room-deleted", handleRoomDeleted)
    //     }
    // }, [status, subscribe, unsubscribe])

    const connect = useCallback(async () => {
        console.debug("Join lobby...")

        await socketConnect()

        subscribe("lobby-player-connected", handlePlayerConnected)
        subscribe("lobby-player-disconnected", handlePlayerDisconnected)
        subscribe("lobby-room-created", handleRoomCreated)
        subscribe("lobby-room-deleted", handleRoomDeleted)

        const name = `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`
        sendWithReply(
            "player-join-lobby",
            { name },
            "player-join-lobby-reply",
        ).then((data: object | undefined) => {
            setPlayer(data as unknown as PlayerRecord)
        })

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
    }, [subscribe, sendWithReply, socketConnect])

    const disconnect = useCallback(() => {
        console.debug("Disconnect from lobby")
        unsubscribe("lobby-player-connected", handlePlayerConnected)
        unsubscribe("lobby-player-disconnected", handlePlayerDisconnected)
        unsubscribe("lobby-room-created", handleRoomCreated)
        unsubscribe("lobby-room-deleted", handleRoomDeleted)
        send("player-leave-lobby", undefined)

        socketDisconnect()
    }, [unsubscribe, send, socketDisconnect])

    const host = useCallback(
        (name: string, options: GameOptions) => {
            const sessionDescription = undefined
            const iceCandidates: unknown[] = []

            return sendWithReply(
                "player-host-game",
                {
                    name,
                    options,
                    sessionDescription,
                    iceCandidates,
                },
                "player-host-game-reply",
            )
        },
        [sendWithReply],
    )

    const join = useCallback(
        (room: RoomRecord) => {
            const sessionDescription = undefined
            const iceCandidates: unknown[] = []

            return sendWithReply(
                "player-join-game",
                {
                    id: room.id,
                    sessionDescription,
                },
                "player-join-game-reply",
            )
        },
        [sendWithReply],
    )

    const leave = useCallback(() => {}, [])

    return {
        player,
        players,
        rooms,
        connect,
        disconnect,
        host,
        join,
        leave,
    }
}
