import { RoomRecord } from "game-signaling-server"
import { createContext, ReactNode, useState, useCallback, useMemo } from "react"

export type State = "main-menu" | "lobby" | "in-game"

interface ManagerContextValue {
    state: State
    room?: RoomRecord
    game?: string
    joinLobby: () => void
    leaveLobby: () => void
    joinRoom: (room: RoomRecord) => void
    leaveRoom: () => void
    joinGame: (id: string) => void
    leaveGame: () => void
}

export const ManagerContext = createContext<ManagerContextValue>({
    state: "main-menu",
    room: undefined,
    game: undefined,
    joinLobby: () => {},
    leaveLobby: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
    joinGame: () => {},
    leaveGame: () => {},
})

export const ManagerProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<State>("main-menu")
    const [room, setRoom] = useState<string>()
    const [game, setGame] = useState<string>()

    const joinLobby = useCallback(() => {
        setState("lobby")
        setRoom(undefined)
        setGame(undefined)
    }, [])

    const leaveLobby = useCallback(() => {
        setState("main-menu")
        setRoom(undefined)
        setGame(undefined)
    }, [])

    const joinRoom = useCallback((id: string) => {
        // setState("lobby-room")
        setRoom(id)
        setGame(undefined)
    }, [])

    const leaveRoom = useCallback(() => {
        // setState("main-menu")
        setRoom(undefined)
        setGame(undefined)
    }, [])

    const joinGame = useCallback((id: string) => {
        setState("in-game")
        setRoom(undefined)
        setGame(id)
    }, [])

    const leaveGame = useCallback(() => {
        setState("main-menu")
        setRoom(undefined)
        setGame(undefined)
    }, [])

    const value = useMemo(
        () => ({
            state,
            room,
            game,
            joinLobby,
            leaveLobby,
            joinRoom,
            leaveRoom,
            joinGame,
            leaveGame,
        }),
        [
            state,
            room,
            game,
            joinLobby,
            leaveLobby,
            joinRoom,
            leaveRoom,
            joinGame,
            leaveGame,
        ],
    )

    return (
        <ManagerContext.Provider value={value}>
            {children}
        </ManagerContext.Provider>
    )
}
