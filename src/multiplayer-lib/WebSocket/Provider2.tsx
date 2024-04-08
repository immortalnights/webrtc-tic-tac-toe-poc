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
    connect: () => void
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
    connect: () => {},
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
        webSocketStore.connect(address)
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
                    body,
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
        [state],
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
