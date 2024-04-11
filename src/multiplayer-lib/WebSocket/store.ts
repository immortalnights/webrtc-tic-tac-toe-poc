import { ConnectionState, WebSocketMessageHandler } from "./types"

let ws: WebSocket | undefined
const onWebSocketMessage = new Set<WebSocketMessageHandler>()
// const messageSubscriptions = new Map<string, ((data: object) => void)[]>()
const subscribers = new Set<() => void>()

export const store = {
    getState(): ConnectionState {
        let state
        switch (ws?.readyState) {
            case WebSocket.CLOSED: {
                state = "disconnected" as const
                break
            }
            case WebSocket.OPEN: {
                state = "connected" as const
                break
            }
            case WebSocket.CONNECTING: {
                state = "connecting" as const
                break
            }
            case WebSocket.CLOSING: {
                state = "disconnecting" as const
                break
            }
            default: {
                state = "disconnected" as const
                break
            }
        }

        return state
    },

    subscribe(onStoreChange: () => void) {
        subscribers.add(onStoreChange)
        return () => {
            subscribers.delete(onStoreChange)
        }
    },

    unsubscribe(onStoreChange: () => void) {
        subscribers.delete(onStoreChange)
    },

    notify() {
        subscribers.forEach((callback) => callback())
    },

    send(name: string, body: object | undefined) {
        const state = this.getState()
        if (ws && state === "connected") {
            ws.send(JSON.stringify({ name, body }))
        } else {
            console.warn(`Cannot send '${name}' while in '${state}' state`)
        }
    },

    connect(address: string) {
        if (this.getState() === "disconnected") {
            const handleOpen = () => {
                // Notify store subscribes of the potential state change
                console.log("notify for open")
                this.notify()
            }

            const handleMessage = (ev: MessageEvent) => {
                const json = JSON.parse(ev.data.toString())

                if (onWebSocketMessage.size > 0) {
                    onWebSocketMessage.forEach((callback) => callback(json))
                } else {
                    console.warn(
                        `No callback to handle WebSocket message`,
                        json,
                    )
                }
            }

            const handleClose = () => {
                if (ws) {
                    ws.onopen = null
                    ws.onmessage = null
                    ws.onclose = null
                    ws.onerror = null
                }

                // Notify store subscribes of the potential state change
                console.log("notify for close")
                this.notify()
            }

            const handleError = () => {
                console.error("WebSocket error")
            }

            // Attempt connection
            ws = new WebSocket(`ws://${address}/`, [])
            this.notify()

            ws.onopen = handleOpen
            ws.onmessage = handleMessage
            ws.onclose = handleClose
            ws.onerror = handleError
        } else {
            console.error(`Cannot connect while in '${this.getState()}' state`)
        }
    },

    disconnect() {
        if (ws) {
            if (this.getState() === "connected") {
                ws.close(3000, "Disconnected by user")
                this.notify()
            }
        }
    },

    addMessageListener(callback: WebSocketMessageHandler) {
        onWebSocketMessage.add(callback)
    },

    removeMessageListener(callback: WebSocketMessageHandler) {
        onWebSocketMessage.delete(callback)
    },
}
