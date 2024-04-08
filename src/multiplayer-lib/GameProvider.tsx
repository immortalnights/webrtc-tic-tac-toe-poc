import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useManager, usePeerConnection } from "."
import { DataChannelMessageHandler } from "./PeerConnection"

export type GameState = "setup" | "ready" | "playing" | "paused" | "finished"
export type PlayerGameState =
    | "joining"
    | "initializing"
    | "world-building"
    | "ready"
    | "paused"
    | "disconnected"

interface GamePlayer {
    id: string
    state: PlayerGameState
}

export interface GameContextValue {
    state: GameState
    name: string
    setup: () => void
    ready: () => void
    finish: () => void
}

export const GameContext = createContext<GameContextValue>({
    state: "setup",
    name: "Unnamed",
    setup: () => {},
    ready: () => {},
    finish: () => {},
})

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const { player } = useManager()
    const { connections, send, subscribe } = usePeerConnection()
    const [state, setState] = useState<GameState>("setup")
    const [name, setName] = useState("Unnamed")
    const [players, setPlayers] = useState<GamePlayer[]>(
        Object.keys(connections).map((peer) => ({
            id: peer,
            state: "joining",
        })),
    )

    const setPlayerState = useCallback(
        (state: PlayerGameState) => {
            send("player-state-update", { state })
        },
        [send],
    )

    const setGameState = useCallback(
        (state: GameState) => {
            if (player?.host) {
                setState(state)
                send("game-state-update", { state })
            }
        },
        [player, send],
    )

    const updatePlayerState = useCallback(
        (peer: string, newState: PlayerGameState) => {
            const originalState = players.find((p) => p.id === peer)?.state
            console.log(
                "Player",
                peer,
                "state changed",
                originalState,
                "=>",
                newState,
            )

            const index = players.findIndex((p) => p.id === peer)

            if (-1 !== index) {
                setPlayers((value) => {
                    const copy = [...value]
                    copy[index] = {
                        id: peer,
                        state: newState,
                    }
                    return copy
                })
            }
        },
        [players],
    )

    useEffect(() => {
        subscribe((peer, data) => {
            if (player?.host) {
                if (data.name === "player-state-update") {
                    const newState = data.body.state as PlayerGameState
                    updatePlayerState(peer, newState)

                    if (newState === "initializing") {
                        console.log("Send initial state to joined player")
                        send("game-update", {}, peer)
                    }
                }
            } else {
                if (data.name === "game-state-update") {
                    setState(data.body.state as GameState)
                }
            }
        })
    }, [player, subscribe, updatePlayerState, send])

    useEffect(() => {
        if (player?.host) {
            if (
                state === "setup" &&
                players.every((p) => p.state === "ready")
            ) {
                console.log("All players are now ready")
                setGameState("playing")
            }
        }
    }, [player, state, players, setGameState])

    const setup = useCallback(() => {
        if (player?.host) {
            // Setup handled by useEffect
        } else {
            setPlayerState("initializing")
        }
    }, [player, setPlayerState])

    const ready = useCallback(() => {
        setPlayerState("ready")
    }, [setPlayerState])

    const finish = useCallback(() => {
        setGameState("finished")
    }, [setGameState])

    const value = useMemo(
        () => ({
            state,
            name,
            setup,
            ready,
            // pause,
            // unpause,
            finish,
        }),
        [state, name, setup, ready, finish],
    )

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
