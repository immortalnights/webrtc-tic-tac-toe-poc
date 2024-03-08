import { ReactNode, createContext, useCallback, useMemo, useState } from "react"
import { SignalingServerConnection } from "./multiplayer-lib/SignalingServerConnection"
import { GameOptions, PlayerRecord, RoomRecord } from "game-signaling-server"

export interface SignalingServerContextValue {
    connected: boolean
    ws: SignalingServerConnection | null
    player: { id: string; name: string } | null
    rooms: RoomRecord[]
    setRooms: React.Dispatch<React.SetStateAction<RoomRecord[]>> | undefined
    connect: () => void
    disconnect: () => void
    host: (name: string, options: GameOptions) => void
    join: (room: RoomRecord) => void
}

export const SignalingServerContext =
    createContext<SignalingServerContextValue>({
        connected: false,
        ws: null,
        player: null,
        rooms: [],
        setRooms: undefined,
        connect: () =>
            console.error("Call to default Context connect function"),
        disconnect: () =>
            console.error("Call to default Context disconnect function"),
        host: () => console.error("Call to default Context host function"),
        join: () => console.error("Call to default Context join function"),
    })

const SignalingServerContextProvider = ({
    address,
    children,
}: {
    address?: string
    children: ReactNode
}) => {
    const [player, setPlayer] = useState<PlayerRecord>({
        id: "",
        name: "BrowserPlayer",
        ready: false,
        host: false,
    })
    const [connected, setConnected] = useState(false)
    const [ws] = useState(
        new SignalingServerConnection(address ?? "127.0.0.1:9001"),
    )
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    const connect = useCallback(async () => {
        try {
            console.log("Connecting...")
            await ws.connect()
            console.log("Connected")

            ws.send("player-join-lobby", { name: player.name })
            const resp = await ws.waitForMessage<PlayerRecord>(
                "player-join-lobby-reply",
                5000,
            )

            setPlayer((p) => ({ ...p, id: resp?.id }))
            setConnected(true)
        } catch (error) {
            console.error("Failed to connect", error)
        } finally {
            console.log("Connection completed")
        }
    }, [ws, player.name])

    const disconnect = useCallback(async () => {
        console.log("Disconnect")
        if (ws.connected) {
            console.log("Disconnecting...")
            await ws.disconnect()
            console.log("Disconnected")
        }
        setRooms([])
        setConnected(false)
        setPlayer((p) => ({ ...p, ready: false, host: false }))
    }, [ws])

    // useEffect(() => {

    const host = useCallback(
        async (name: string, options: GameOptions) => {},
        [ws],
    )

    const join = useCallback(async (room: RoomRecord) => {}, [ws])

    //     console.log("connection status changed", ws.connected)
    // }, [ws.connected])
    const value = useMemo(
        () => ({
            player,
            connected,
            ws,
            rooms,
            setRooms,
            connect,
            disconnect,
            host,
            join,
        }),
        [player, connected, ws, rooms, connect, disconnect, host, join],
    )

    return (
        <SignalingServerContext.Provider value={value}>
            {children}
        </SignalingServerContext.Provider>
    )
}

export default SignalingServerContextProvider
