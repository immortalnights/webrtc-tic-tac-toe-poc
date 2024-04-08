export type ConnectionStatus = "disconnected" | "connecting" | "connected"

export type DataChannelMessageHandler = (
    peer: string,
    data: { name: string; body: object },
) => void

export interface Connection {
    pc: RTCPeerConnection
    dc: RTCDataChannel | undefined
    status: ConnectionStatus
    eventHandlers?: {
        onOpen: (event: Event) => void
        onClose: (event: Event) => void
        onMessage: (event: MessageEvent) => void
        onError: (event: Event) => void
    }
}

export interface ConnectionMap {
    [peer: string]: Connection
}
