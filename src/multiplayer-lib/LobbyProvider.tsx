import { GameOptions, PlayerRecord, RoomRecord } from "game-signaling-server"
import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useWebSocket } from "./useWebSocket"

export type ConnectionStatus = "disconnected" | "connecting" | "connected"

interface LobbyContextValue {
    status: ConnectionStatus
    player: PlayerRecord | null
    connect: () => Promise<object | undefined>
    host: (name: string, options: GameOptions) => Promise<object | undefined>
    join: (room: RoomRecord) => Promise<object | undefined>
    leave: () => void
    disconnect: () => void
}

export const LobbyContext = createContext<LobbyContextValue>({
    status: "disconnected",
    player: null,
    connect: () => Promise.reject(new Error("Missing Lobby Context Provider")),
    host: () => Promise.reject(new Error("Missing Lobby Context Provider")),
    join: () => Promise.reject(new Error("Missing Lobby Context Provider")),
    leave: () => {
        throw new Error("Missing Lobby Context Provider")
    },
    disconnect: () => {
        throw new Error("Missing Lobby Context Provider")
    },
})

export const LobbyProvider = ({ children }: { children: ReactNode }) => {
    const { connect: socketConnect, send, sendWithReply } = useWebSocket()

    const [status, setStatus] = useState<ConnectionStatus>("disconnected")
    const [player, setPlayer] = useState<PlayerRecord | null>(null)

    const connect = useCallback(async () => {
        console.debug("Join lobby...")
        setStatus("connecting")

        await socketConnect()

        const name = `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`
        const reply = await sendWithReply(
            "player-join-lobby",
            { name },
            "player-join-lobby-reply",
        )
        console.debug(`Player ${reply.id}`)
        setPlayer(reply as unknown as PlayerRecord)
        setStatus("connected")

        return reply
    }, [sendWithReply, socketConnect])

    const host = useCallback(
        async (name: string, options: GameOptions) => {
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
        async (room: RoomRecord) => {
            const sessionDescription = undefined

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

    const disconnect = useCallback(() => {
        console.debug("Disconnect from lobby")

        send("player-leave-lobby", undefined)
        setStatus("disconnected")
    }, [send])

    useEffect(() => {
        // disconnect up on unmount
        return () => {
            disconnect()
        }
    }, [disconnect])

    const value = useMemo(
        () => ({
            status,
            player,
            connect,
            host,
            join,
            leave,
            disconnect,
        }),
        [status, player, connect, host, join, leave, disconnect],
    )

    return (
        <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>
    )
}
