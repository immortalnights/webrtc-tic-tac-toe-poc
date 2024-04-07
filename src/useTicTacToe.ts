import { useContext } from "react"
import { TicTacToeContext } from "./TicTacToeProvider"

export const useTicTacToe = () => {
    const context = useContext(TicTacToeContext)
    if (!context) {
        throw new Error(
            "useTicTacToe must be used within a TicTacToeContextProvider",
        )
    }
    return context
}
