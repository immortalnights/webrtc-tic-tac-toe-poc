import {
    ReactNode,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

export type ConnectionStatus = "disconnected" | "connecting" | "connected"

export interface WebSocketContextValue {
    status: ConnectionStatus
    connect: () => void
    subscribe: (name: string, callback: (data: object) => void) => void
    unsubscribe: (name: string, callback?: (data: object) => void) => void
    send: (name: string, data: object | undefined) => void
    sendWithReply: (
        name: string,
        data: object | undefined,
        replyName: string,
    ) => Promise<object | undefined>
    disconnect: () => void
}

export const WebSocketContext = createContext<WebSocketContextValue>({
    status: "disconnected",
    connect: () => {},
    subscribe: () => {},
    unsubscribe: () => {},
    send: () => {},
    sendWithReply: () => Promise.reject(),
    disconnect: () => {},
})

interface Subscription {
    [key: string]: ((data: object) => void)[]
}

export const WebSocketContextProvider = ({
    address = "127.0.0.1:9001",
    children,
}: {
    address?: string
    children: ReactNode
}) => {
    const ws = useRef<WebSocket>()
    const [status, setStatus] = useState<ConnectionStatus>("disconnected")
    const [subscriptions, setSubscriptions] = useState<Subscription>([])

    // Used by `handleClose` so needs to be defined before it.
    const disconnect = useCallback(() => {
        if (ws.current) {
            console.log("Disconnecting...")
            if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.close()
                ws.current.onopen = null
            } else {
                const socket = ws.current
                socket.onopen = () => {
                    socket.close()
                    socket.onopen = null
                }
            }
            ws.current.onmessage = null
            ws.current.onclose = null
            ws.current.onerror = null
            setStatus("disconnected")
            console.debug("set disconnected state")
            ws.current = undefined
        }
    }, [])

    const handleOpen = useCallback((event: Event) => {
        console.log("handleOpen", event)

        if (!ws.current) {
            throw new Error("WebSocket has not been initialized")
        }

        setStatus(
            ws.current.readyState === WebSocket.OPEN
                ? "connected"
                : "disconnected",
        )
    }, [])

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            console.log("handleMessage", event)

            if (!ws.current) {
                throw new Error("WebSocket has not been initialized")
            }

            const message = JSON.parse(event.data)

            const name = message.name
            const body = message.data

            if (subscriptions[name]) {
                subscriptions[name].forEach((callback) => {
                    callback(body)
                })
            } else {
                console.debug(`No subscribers for ${name}`, subscriptions)
            }
        },
        [ws, subscriptions],
    )

    const handleClose = useCallback(
        (event: Event) => {
            console.log("handleClose", event)

            if (!ws.current) {
                throw new Error("WebSocket has not been initialized")
            }

            disconnect()
        },
        [disconnect],
    )

    const handleError = useCallback((event: Event) => {
        console.log("handleError", event)

        if (!ws.current) {
            throw new Error("WebSocket has not been initialized")
        }
    }, [])

    const connect = useCallback(() => {
        console.log("Connecting...")
        setStatus("connecting")
        ws.current = new WebSocket(`ws://${address}/`, [])
    }, [address])

    useEffect(() => {
        if (ws.current && (status === "connected" || status === "connecting")) {
            ws.current.onopen = handleOpen
            ws.current.onmessage = handleMessage
            ws.current.onclose = handleClose
            ws.current.onerror = handleError
        }
    }, [status, handleOpen, handleMessage, handleClose, handleError])

    const subscribe = useCallback(
        (name: string, callback: (data: object) => void) => {
            setSubscriptions((prevSubscriptions) => ({
                ...prevSubscriptions,
                [name]: [...(prevSubscriptions[name] || []), callback],
            }))
        },
        [],
    )

    const unsubscribe = useCallback(
        (name: string, callback: (data: object) => void) => {
            setSubscriptions((prevSubscriptions) => ({
                ...prevSubscriptions,
                [name]: prevSubscriptions[name].filter((cb) => cb !== callback),
            }))
        },
        [],
    )

    const send = useCallback((name: string, data: object | undefined) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    name,
                    data,
                }),
            )
        } else {
            console.error("WebSocket is not open")
        }
    }, [])

    const sendWithReply = useCallback(
        (name: string, data: object | undefined, replyName: string) => {
            return new Promise<object | undefined>((resolve, reject) => {
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    const timeout = window.setTimeout(() => {
                        reject("Timeout waiting for reply message")
                        ws.current?.removeEventListener(
                            "message",
                            handleMessage,
                        )
                    }, 5000)

                    const handleMessage = (event: MessageEvent) => {
                        const reply = JSON.parse(event.data)
                        if (reply.name === replyName) {
                            window.clearTimeout(timeout)
                            ws.current?.removeEventListener(
                                "message",
                                handleMessage,
                            )
                            resolve(reply.data)
                        }
                    }

                    ws.current.addEventListener("message", handleMessage)
                    send(name, data)
                } else {
                    console.error("WebSocket is not open")
                    reject("WebSocket is not open")
                }
            })
        },
        [send],
    )

    const value = useMemo(
        () => ({
            status,
            connect,
            subscribe,
            unsubscribe,
            send,
            sendWithReply,
            disconnect,
        }),
        [
            status,
            connect,
            subscribe,
            unsubscribe,
            send,
            sendWithReply,
            disconnect,
        ],
    )

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    )
}
