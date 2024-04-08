export type ConnectionState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "disconnecting"

export type WebSocketMessageHandler = (data: {
    name: string
    body: object
}) => void
