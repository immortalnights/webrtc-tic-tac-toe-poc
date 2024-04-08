import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { usePeerConnection } from "./multiplayer-lib/usePeerConnection"
import { useManager } from "./multiplayer-lib"
import { useGame } from "./multiplayer-lib/useGame"
import {
    usePeerConnection,
    type DataChannelMessageHandler,
} from "./multiplayer-lib/PeerConnection"

type Token = "O" | "X"
type Board = (undefined | Token)[]

export interface TicTacToeContextValue {
    token: Token
    turn: Token
    spaces: Board
    takeTurn: (position: number) => void
}

export const TicTacToeContext = createContext<TicTacToeContextValue>({
    token: "O",
    turn: "O",
    spaces: [] as undefined[],
    takeTurn: () => {},
})

// const reducer = (state, action) => {
//     switch (action.name) {
//         case "game-update"
//     }
// }

export const TicTacToeProvider = ({ children }: { children: ReactNode }) => {
    const { player } = useManager()
    const { state, setup, ready, finish } = useGame()
    const { send, subscribe } = usePeerConnection()
    const [token] = useState<Token>(player?.host ? "O" : "X")
    const [turn, setTurn] = useState<Token>("O")
    const [spaces, setSpaces] = useState<Board>(new Array(9).fill(undefined))

    useEffect(() => {
        if (player?.host) {
            send("game-update", { turn, spaces })
        }
    }, [player, turn, spaces, send])

    const takePlayerTurn = useCallback(
        (playerToken: Token, position: number) => {
            if (playerToken !== "O" && playerToken !== "X") {
                throw Error("Invalid player")
            }

            if (playerToken !== turn) {
                throw Error("Incorrect player turn")
            }

            if (position < 0 || position > 8) {
                throw Error("Invalid position, out of range")
            }

            if (spaces[position]) {
                throw Error("Invalid position, space take")
            }

            console.debug(
                `Placing token ${playerToken} at position ${position}`,
            )
            setSpaces((value) => {
                const copy = [...value]
                copy[position] = playerToken
                return copy
            })
        },
        [turn, spaces],
    )

    const handlePlayerMove = useCallback(
        (_: Token, position: number) => {
            if (player?.host) {
                takePlayerTurn(turn, position)

                setTurn((old) => (old === "O" ? "X" : "O"))

                // const winner = calculateWinner()
                // if (winner) {
                //     finish({ winner })
                // }
            } else {
                console.error(
                    "None host player cannot modify the game state directly!",
                )
            }
        },
        [player, turn, takePlayerTurn],
    )

    useEffect(() => {
        subscribe((_, data) => {
            if (player?.host) {
                if (data.name === "player-input") {
                    // There is no map betweem the peer and the other player token,
                    // this would be needed in a 3+ player game.
                    handlePlayerMove("X", data.body.position)
                }
            } else {
                if (data.name === "game-update") {
                    if (state === "setup") {
                        // handleInitialGameData
                        console.log("Received initial update")
                        ready()
                    } else {
                        // handleGameUpdate
                        console.log("Received game update")
                        if (data.body.spaces) {
                            setTurn(data.body.turn)
                            setSpaces(data.body.spaces)
                        }
                    }
                }
            }
        })

        setup()
    }, [subscribe, player, handlePlayerMove, state, setup])

    const takeTurn = useCallback(
        (position: number) => {
            if (player?.host) {
                handlePlayerMove(token, position)
            } else {
                send("player-input", { token, position })
            }
        },
        [player, token, handlePlayerMove, send],
    )

    const value = useMemo(
        () => ({
            token,
            turn,
            spaces,
            takeTurn,
        }),
        [token, turn, spaces, takeTurn],
    )

    return (
        <TicTacToeContext.Provider value={value}>
            {children}
        </TicTacToeContext.Provider>
    )
}
