import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from "react"
import { store as webSocketStore } from "./store"
import { ConnectionState, WebSocketMessageHandler } from "./types"

interface WebSocketContextValue {
    state: ConnectionState
    connect: () => Promise<void>
    subscribe: (callback: WebSocketMessageHandler) => void
    unsubscribe: (callback: WebSocketMessageHandler) => void
    disconnect: () => void
    send: (name: string, data: object | undefined) => void
    sendWithReply: (
        name: string,
        data: object | undefined,
        replyName: string,
    ) => Promise<object | undefined>
}

export const WebSocketContext = createContext<WebSocketContextValue>({
    state: "disconnected",
    connect: () => {
        throw new Error("Missing WebSocket Context Provider")
    },
    subscribe: () => {},
    unsubscribe: () => {},
    disconnect: () => {},
    send: () => {},
    sendWithReply: () => {
        throw new Error("Missing WebSocket Context Provider")
    },
})

export const WebSocketProvider = ({
    address = "127.0.0.1:9001",
    children,
}: {
    address?: string
    children: ReactNode
}) => {
    const state = useSyncExternalStore(
        webSocketStore.subscribe,
        webSocketStore.getState,
    )

    const connect = useCallback(() => {
        const state = webSocketStore.getState()
        let ret
        switch (state) {
            case "connected": {
                ret = Promise.resolve()
                break
            }
            case "disconnected": {
                ret = new Promise<void>((resolve, reject) => {
                    const handleStateChange = () => {
                        const state = webSocketStore.getState()
                        if (state === "connected") {
                            webSocketStore.unsubscribe(handleStateChange)
                            resolve()
                        } else if (state === "disconnected") {
                            webSocketStore.unsubscribe(handleStateChange)
                            reject()
                        }

                        // TODO timeout
                    }

                    webSocketStore.subscribe(handleStateChange)
                    webSocketStore.connect(address)
                })
                break
            }
            case "connecting": {
                ret = new Promise<void>((resolve, reject) => {
                    const handleStateChange = () => {
                        const state = webSocketStore.getState()
                        if (state === "connected") {
                            webSocketStore.unsubscribe(handleStateChange)
                            resolve()
                        } else if (state === "disconnected") {
                            webSocketStore.unsubscribe(handleStateChange)
                            reject()
                        }

                        // TODO timeout
                    }

                    webSocketStore.subscribe(handleStateChange)
                })
                break
            }
            default: {
                ret = Promise.reject(
                    new Error(`Cannot connect while in '${state}' state`),
                )
                break
            }
        }

        return ret
    }, [address])

    const disconnect = useCallback(() => {
        webSocketStore.disconnect()
    }, [])

    const subscribe = useCallback((callback: WebSocketMessageHandler) => {
        webSocketStore.addMessageListener(callback)
    }, [])

    const unsubscribe = useCallback((callback: WebSocketMessageHandler) => {
        webSocketStore.removeMessageListener(callback)
    }, [])

    const send = useCallback((name: string, body: object | undefined) => {
        webSocketStore.send(name, body)
    }, [])

    const sendWithReply = useCallback(
        (name: string, body: object | undefined, replyName: string) => {
            return new Promise<object | undefined>((resolve, reject) => {
                const handleReply: WebSocketMessageHandler = ({
                    name,
                    data: body,
                }) => {
                    if (name === replyName) {
                        webSocketStore.removeMessageListener(handleReply)
                        resolve(body)
                    }

                    // TODO timeout?
                }

                webSocketStore.addMessageListener(handleReply)
                webSocketStore.send(name, body)
            })
        },
        [],
    )

    const value = useMemo<WebSocketContextValue>(
        () => ({
            state,
            connect,
            disconnect,
            subscribe,
            unsubscribe,
            send,
            sendWithReply,
        }),
        [
            state,
            connect,
            disconnect,
            subscribe,
            unsubscribe,
            send,
            sendWithReply,
        ],
    )

    useEffect(() => {
        return () => {
            webSocketStore.disconnect()
        }
    }, [address])

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    )
}
