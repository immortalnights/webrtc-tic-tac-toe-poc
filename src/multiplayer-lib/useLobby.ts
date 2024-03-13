import { useCallback, useEffect, useState } from "react"
import { useWebSocket } from "./useWebSocket"
import { PlayerRecord, RoomRecord } from "game-signaling-server"

export const useLobby = () => {
    const { connected, subscribe, unsubscribe, send, sendWithReply } =
        useWebSocket()
    const [player, setPlayer] = useState<PlayerRecord>([])
    const [players, setPlayers] = useState<PlayerRecord[]>([])
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    useEffect(() => {
        const handlePlayerConnected = () => {
            console.debug("Player connected to lobby")
        }

        const handlePlayerDisconnected = () => {
            console.debug("Player disconnected from lobby")
        }
        const handleRoomCreated = () => {
            console.debug("Room created")
        }

        const handleRoomDeleted = () => {
            console.debug("Room deleted")
        }

        subscribe("lobby-player-connected", handlePlayerConnected)
        subscribe("lobby-player-disconnected", handlePlayerDisconnected)
        subscribe("lobby-room-created", handleRoomCreated)
        subscribe("player-lobby-deleted", handleRoomDeleted)

        const joinLobby = async () => {
            const name = `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`
            sendWithReply(
                "player-join-lobby",
                { name },
                "player-join-lobby-reply",
            ).then((data: object | undefined) => {
                setPlayer(data as unknown as PlayerRecord)
            })
        }

        joinLobby()

        return () => {
            unsubscribe("lobby-player-connected", handlePlayerConnected)
            unsubscribe("lobby-player-disconnected", handlePlayerDisconnected)
            unsubscribe("lobby-room-created", handleRoomCreated)
            unsubscribe("player-lobby-deleted", handleRoomDeleted)
            send("player-leave-lobby", undefined)
        }
    }, [send, sendWithReply, subscribe, unsubscribe])

    const host = useCallback(() => {}, [])

    const join = useCallback(() => {}, [])

    const leave = useCallback(() => {}, [])

    return {
        player,
        players,
        rooms,
        host,
        join,
        leave,
    }
}
