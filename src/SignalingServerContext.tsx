import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react"
import { SignalingServerConnection } from "./multiplayer-lib/SignalingServerConnection"
import {
    GameOptions,
    PlayerRecord,
    RoomRecord,
    ServerReplyData,
    throwError,
} from "game-signaling-server"
import { PeerConnectionContext } from "./PeerConnectionContext"

export interface SignalingServerContextValue {
    connected: boolean
    connect: (name: string) => Promise<PlayerRecord>
    disconnect: () => Promise<void>
    getGames: () => Promise<{ games: RoomRecord[] }>
    host: (name: string, options: GameOptions) => Promise<RoomRecord>
    join: (room: RoomRecord) => Promise<RoomRecord>
    setReady: (id: string, ready: boolean) => void
    start: (id: string) => void
    leave: () => void
    exit: () => void
    subscribe: SignalingServerConnection["subscribe2"]
    unsubscribe: SignalingServerConnection["unsubscribe"]
}

export const SignalingServerContext =
    createContext<SignalingServerContextValue>({
        connected: false,
        connect: () => {
            console.error("Call to default Context connect function")
            return Promise.reject()
        },
        disconnect: () => {
            console.error("Call to default Context disconnect function")
            return Promise.reject()
        },
        host: () => {
            console.error("Call to default Context host function")
            return Promise.reject()
        },
        join: () => {
            console.error("Call to default Context join function")
            return Promise.reject()
        },
        getGames: () => {
            console.error("Call to default Context getGames function")
            return Promise.reject()
        },
        setReady: () => {},
        start: () => {},
        leave: () => {},
        exit: () => {},
        subscribe: () => console.error(""),
        unsubscribe: () => console.error(""),
    })

const SignalingServerContextProvider = ({
    address,
    children,
}: {
    address?: string
    children: ReactNode
}) => {
    const { offer, answer } = useContext(PeerConnectionContext)
    const [connected, setConnected] = useState(false)
    const ws = useRef(
        new SignalingServerConnection(address ?? "127.0.0.1:9001"),
    )

    const connect = useCallback(
        async (name: string) => {
            console.log("Connecting...")
            await ws.current.connect()
            console.log("Connected")

            ws.current.send("player-join-lobby", { name })
            const resp = await ws.current.waitForMessage<PlayerRecord>(
                "player-join-lobby-reply",
                5000,
            )

            if (!resp) {
                throw new Error("Invalid connection reply")
            }

            setConnected(true)
            return resp
        },
        [ws],
    )

    const disconnect = useCallback(async () => {
        console.log("Disconnect")
        if (ws.current.connected) {
            console.log("Disconnecting...")
            await ws.current.disconnect()
            console.log("Disconnected")
        }
        setConnected(false)
    }, [ws])

    const getGames = useCallback(async () => {
        console.log("Requesting games")

        ws.current.send("player-list-games")

        type ReplyMessageData = ServerReplyData<"player-list-games-reply">

        const resp = (await ws.current.waitForMessage<ReplyMessageData>(
            "player-list-games-reply",
        )) as unknown as { games: RoomRecord[] }

        return resp
    }, [ws])

    const host = useCallback(
        async (name: string, options: GameOptions) => {
            console.log("Requesting Peer offer")
            const { offer: sessionDescription, iceCandidates } = await offer()

            console.log("Sending host game message")
            ws.current.send("player-host-game", {
                name,
                options,
                sessionDescription,
                iceCandidates,
            })

            type ReplyMessageData = ServerReplyData<"player-host-game-reply">

            console.log("Waiting for host game response")
            const data = (await ws.current.waitForMessage<ReplyMessageData>(
                "player-host-game-reply",
            )) as unknown as RoomRecord

            return data
        },
        [ws, offer],
    )

    const join = useCallback(
        async (room: RoomRecord) => {
            const host =
                room.players.find((player) => player.host) ??
                throwError("Failed to find host")

            if (!host.sessionDescription) {
                throw Error("Room host does not have peer connection")
            }

            if (!host.iceCandidates) {
                throw Error("Room host does not have ice candidates")
            }

            console.debug("Answering RTC offer")
            const sessionDescription = await answer(
                host.sessionDescription,
                host.iceCandidates,
            )

            ws.current.send("player-join-game", {
                id: room.id,
                sessionDescription,
            })

            type ReplyMessageData = ServerReplyData<"player-join-game-reply">

            const data = (await ws.current.waitForMessage<ReplyMessageData>(
                "player-join-game-reply",
            )) as unknown as RoomRecord

            return data
        },
        [ws, answer],
    )

    const setReady = useCallback(
        (id: string, ready: boolean) => {
            ws.current.send("player-change-ready-state", { id, ready })
        },
        [ws],
    )

    const start = useCallback(
        (id: string) => {
            ws.current.send("player-start-game", { id })
        },
        [ws],
    )

    const leave = useCallback(() => {
        ws.current.send("player-leave-game")
    }, [ws])

    const exit = useCallback(() => {
        ws.current.send("player-leave-lobby")
    }, [ws])

    const value = useMemo(
        () => ({
            connected,
            connect,
            disconnect,
            getGames,
            host,
            join,
            setReady,
            start,
            leave,
            exit,
            subscribe: ws.current.subscribe2.bind(ws.current),
            unsubscribe: ws.current.unsubscribe.bind(ws.current),
        }),
        [
            connected,
            ws,
            connect,
            disconnect,
            getGames,
            host,
            join,
            setReady,
            start,
            leave,
            exit,
        ],
    )

    return (
        <SignalingServerContext.Provider value={value}>
            {children}
        </SignalingServerContext.Provider>
    )
}

export default SignalingServerContextProvider
