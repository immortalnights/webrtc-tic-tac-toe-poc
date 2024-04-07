import { useContext } from "react"
import { GameContext } from "./GameProvider"

export const useGame = () => {
    const context = useContext(GameContext)
    if (!context) {
        throw new Error("useGame must be used within a GameContextProvider")
    }
    return context
}
