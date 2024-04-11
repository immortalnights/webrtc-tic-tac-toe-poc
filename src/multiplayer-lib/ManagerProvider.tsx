import { PlayerRecord, RoomRecord, throwError } from "game-signaling-server"
import { createContext, ReactNode, useState, useCallback, useMemo } from "react"
import { useWebSocket } from "./WebSocket"

export type State = "main-menu" | "lobby" | "in-game"

interface ManagerContextValue {
    state: State
    player?: PlayerRecord
    room?: RoomRecord
    game?: string
    setPlayer: React.Dispatch<React.SetStateAction<PlayerRecord | undefined>>
    joinLobby: () => void
    leaveLobby: () => void
    joinRoom: (room: RoomRecord, host: boolean) => void
    leaveRoom: () => void
    joinGame: (id: string) => void
    leaveGame: () => void
}

export const ManagerContext = createContext<ManagerContextValue>({
    state: "main-menu",
    player: undefined,
    room: undefined,
    game: undefined,
    setPlayer: () => {},
    joinLobby: () => {},
    leaveLobby: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
    joinGame: () => {},
    leaveGame: () => {},
})

export const ManagerProvider = ({ children }: { children: ReactNode }) => {
    const { connect: socketConnect, sendWithReply, send } = useWebSocket()
    const [state, setState] = useState<State>("main-menu")
    const [player, setPlayer] = useState<PlayerRecord>()
    const [room, setRoom] = useState<string>()
    const [game, setGame] = useState<string>()

    const joinLobby = useCallback(async () => {
        await socketConnect()

        const name = `BrowserPlayer${Math.floor(Math.random() * 100 + 1)}`
        const reply = await sendWithReply(
            "player-join-lobby",
            { name },
            "player-join-lobby-reply",
        )

        const player =
            reply && "id" in reply
                ? (reply as PlayerRecord)
                : throwError("Failed to receive player ID")

        console.debug(`Player ${player.id}`)
        setPlayer(player)
        setState("lobby")
        setRoom(undefined)
        setGame(undefined)
    }, [sendWithReply, socketConnect])

    const leaveLobby = useCallback(() => {
        send("player-leave-lobby", undefined)
        setState("main-menu")
        setRoom(undefined)
        setGame(undefined)
    }, [send])

    const joinRoom = useCallback(
        (room: RoomRecord, host: boolean) => {
            // const reply = sendWithReply(
            //     "player-join-game",
            //     {
            //         id: room.id,
            //         sessionDescription: undefined,
            //         autoReady: true,
            //     },
            //     "player-join-game-reply",
            // )

            // reply.then(() => {
            //     // This could be more robust or could be handled based on the (future) join game notification
            //     // setState("lobby-room")
            //     setRoom(room.id)
            //     setGame(undefined)
            //     setPlayer((state) =>
            //         state ? { ...state, host: false } : undefined,
            //     )
            // })

            setRoom(room.id)
            setGame(undefined)
            setPlayer((state) =>
                state ? { ...state, host: false } : undefined,
            )
        },
        [sendWithReply],
    )

    const leaveRoom = useCallback(() => {
        send("player-leave-room", undefined)
        setState("lobby")
        setRoom(undefined)
        setGame(undefined)
    }, [send])

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
            player,
            room,
            game,
            setPlayer,
            joinLobby,
            leaveLobby,
            joinRoom,
            leaveRoom,
            joinGame,
            leaveGame,
        }),
        [
            state,
            player,
            room,
            game,
            setPlayer,
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
