import { useContext } from "react"
import { WebSocketContext } from "./WebSocketProvider"

export const useWebSocket = () => useContext(WebSocketContext)
