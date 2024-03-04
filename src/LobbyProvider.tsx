import { ReactNode, createContext, useCallback, useMemo, useState } from "react"
import { Lobby, LocalPlayer } from "./multiplayer-lib"

export interface LobbyContextValue {
    connected: boolean
    player: LocalPlayer | null
    lobby: Lobby | null
    connect: () => void
    disconnect: () => void
}

export const LobbyContext = createContext<LobbyContextValue>({
    connected: false,
    player: null,
    lobby: null,
    connect: () => {
        console.error("")
    },
    disconnect: () => {
        console.error("")
    },
})

const LobbyContextProvider = ({
    name,
    address,
    children,
}: {
    name?: string
    address?: string
    children: ReactNode
}) => {
    const [connected, setConnected] = useState(false)
    const [player, setPlayer] = useState<LocalPlayer | null>(
        new LocalPlayer(name ?? "BrowserPlayer"),
    )
    const [lobby, setLobby] = useState<Lobby | null>(
        new Lobby(address ?? "127.0.0.1:9001"),
    )

    const connect = useCallback(async () => {
        if (!lobby) {
            throw new Error("")
        } else if (!player) {
            throw new Error("")
        }

        console.log("Connecting...")
        try {
            await lobby.connect(player)
            setConnected(true)
        } catch (error) {
            console.error("Failed to connect")
        } finally {
            console.log("Connected")
        }
    }, [lobby, player])

    const disconnect = useCallback(async () => {
        if (lobby) {
            lobby.disconnect()
            setPlayer(null)
            setLobby(null)
        }

        setConnected(false)
    }, [lobby])

    const value = useMemo(
        () => ({
            connected,
            player,
            lobby,
            connect,
            disconnect,
        }),
        [connected, player, lobby, connect, disconnect],
    )

    return (
        <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>
    )
}

export default LobbyContextProvider
