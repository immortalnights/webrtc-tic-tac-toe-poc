import { useContext } from "react"
import { ManagerContext } from "./ManagerProvider"

export const useManager = () => {
    const context = useContext(ManagerContext)
    if (!context) {
        throw new Error(
            "useManager must be used within a ManagerContextProvider",
        )
    }
    return context
}
