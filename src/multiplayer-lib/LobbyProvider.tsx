import {
    GameOptions,
    PlayerRecord,
    RoomRecord,
    throwError,
} from "game-signaling-server"
import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useWebSocket } from "./WebSocket"
import { useManager } from "."

export type ConnectionStatus = "disconnected" | "connecting" | "connected"

interface LobbyContextValue {
    status: ConnectionStatus
    connect: () => Promise<object | undefined>
    host: (name: string, options: GameOptions) => Promise<object | undefined>
    join: (room: RoomRecord) => Promise<object | undefined>
    leave: () => void
    disconnect: () => void
}

export const LobbyContext = createContext<LobbyContextValue>({
    status: "disconnected",
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
    const { setPlayer, joinRoom, leaveLobby } = useManager()
    const {
        state: socketState,
        connect: socketConnect,
        send,
        sendWithReply,
    } = useWebSocket()
    const [status, setStatus] = useState<ConnectionStatus>("disconnected")
    const [playerName] = useState(
        `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`,
    )

    console.log("LobbyProvider.render", status, socketState)

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
    }, [sendWithReply, socketConnect, setPlayer])

    const host = useCallback(
        async (name: string, options: GameOptions) => {
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

            reply.then(() => {
                joinRoom(room, true)
                // setPlayer((state) =>
                //     state ? { ...state, host: true } : undefined,
                // )
            })

            return reply
        },
        [sendWithReply, joinRoom],
    )

    const join = useCallback(
        async (room: RoomRecord) => {
            const sessionDescription = undefined

            const reply = sendWithReply(
                "player-join-game",
                {
                    id: room.id,
                    sessionDescription,
                    autoReady: true,
                },
                "player-join-game-reply",
            )

            reply.then(() => {
                joinRoom(room, false)
                // setPlayer((state) =>
                //     state ? { ...state, host: false } : undefined,
                // )
            })

            return reply
        },
        [sendWithReply, joinRoom],
    )

    const leave = useCallback(() => {
        send("player-leave-room", undefined)
    }, [send])

    const disconnect = useCallback(() => {
        if (status === "connected") {
            console.debug("Disconnect from lobby")
            send("player-leave-lobby", undefined)
            setStatus("disconnected")
            leaveLobby()
        }
    }, [status, send])

    const lobbyConnect = useCallback(async () => {
        return sendWithReply(
            "player-join-lobby",
            { name: playerName },
            "player-join-lobby-reply",
        ).then((reply) => {
            return reply && "id" in reply
                ? (reply as PlayerRecord)
                : throwError("Failed to receive player ID")
        })
    }, [playerName, sendWithReply])

    const connectToLobby = useCallback(async () => {
        console.debug("Socket connecting...")
        await socketConnect()
        console.debug("Lobby connecting...")
        const player = await lobbyConnect()
        console.debug("Lobby connected!")
        setPlayer(player)
        setStatus("connected")
    }, [lobbyConnect, setPlayer, socketConnect])

    // useEffect(() => {
    //     connectToLobby()

    //     return () => {
    //         console.log("Should disconnect?")
    //         disconnect()
    //     }
    // }, [connectToLobby, disconnect])

    const value = useMemo(
        () => ({
            status,
            connect,
            host,
            join,
            leave,
            disconnect,
        }),
        [status, connect, host, join, leave, disconnect],
    )

    return (
        <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>
    )
}
