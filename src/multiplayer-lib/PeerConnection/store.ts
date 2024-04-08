import { ConnectionMap, DataChannelMessageHandler } from "./types"

let connections: ConnectionMap = {}
const onDataChannelMessage = new Set<DataChannelMessageHandler>()
const subscribers = new Set<() => void>()

export const peerConnectionStore = {
    getConnections() {
        return connections
    },

    find(peer: string) {
        return connections[peer]
    },

    subscribe(onStoreChange: () => void) {
        subscribers.add(onStoreChange)
        return () => {
            subscribers.delete(onStoreChange)
        }
    },

    notify() {
        subscribers.forEach((callback) => callback())
    },

    sendTo(peer: string, message: object) {
        const connection = connections[peer]
        if (connection) {
            connection.dc?.send(JSON.stringify(message))
        }
    },

    sendToAll(message: object) {
        Object.entries(connections).forEach(([_, connection]) =>
            connection.dc?.send(JSON.stringify(message)),
        )
    },

    setMessageCallback(callback: DataChannelMessageHandler) {
        onDataChannelMessage.add(callback)
    },

    removeMessageCallback(callback: DataChannelMessageHandler) {
        onDataChannelMessage.delete(callback)
    },

    addConnection(peer: string, pc: RTCPeerConnection, dc?: RTCDataChannel) {
        // pc.addEventListener("connectionstatechange", () => {
        //     console.debug(`connectionstatechange for ${peer}`, pc.connectionState)
        // })

        connections = {
            ...connections,
            [peer]: { ...connections[peer], pc, dc, status: "connecting" },
        }

        if (dc) {
            this.listenToDataChannel(peer, dc)
        }

        this.notify()
    },

    setDataChannel(peer: string, dc: RTCDataChannel) {
        connections = {
            ...connections,
            [peer]: { ...connections[peer], dc },
        }
        this.listenToDataChannel(peer, dc)
        this.notify()
    },

    listenToDataChannel(peer: string, dc: RTCDataChannel) {
        this.stopListeningToDataChannel(peer)

        const onOpen = (event: Event) => {
            console.debug("dc.open", event)
            connections = {
                ...connections,
                [peer]: { ...connections[peer], status: "connected" },
            }

            this.notify()
        }

        const onClose = (event: Event) => {
            console.debug("dc.close", event)
            connections = {
                ...connections,
                [peer]: { ...connections[peer], status: "disconnected" },
            }

            this.notify()
        }

        const onMessage = (event: MessageEvent) => {
            console.debug("Received peer message", event.data)
            const json = JSON.parse(event.data.toString())

            if (onDataChannelMessage.size > 0) {
                onDataChannelMessage.forEach((callback) => callback(peer, json))
            } else {
                console.warn("No callback to handle DataChannel message")
            }
        }

        const onError = (event: Event) => {
            console.error(event)
        }

        dc.addEventListener("open", onOpen)
        dc.addEventListener("close", onClose)
        dc.addEventListener("message", onMessage)
        dc.addEventListener("error", onError)

        connections = {
            ...connections,
            [peer]: {
                ...connections[peer],
                eventHandlers: {
                    onOpen,
                    onClose,
                    onMessage,
                    onError,
                },
            },
        }
    },

    stopListeningToDataChannel(peer: string) {
        const connection = connections[peer]
        if (connection?.dc && connection?.eventHandlers) {
            connection.dc.removeEventListener(
                "open",
                connection.eventHandlers.onOpen,
            )
            connection.dc.removeEventListener(
                "close",
                connection.eventHandlers.onClose,
            )
            connection.dc.removeEventListener(
                "message",
                connection.eventHandlers.onMessage,
            )
            connection.dc.removeEventListener(
                "error",
                connection.eventHandlers.onError,
            )
            connection.eventHandlers = undefined
        }
    },

    removeConnection(peer: string) {
        this.stopListeningToDataChannel(peer)
        connections[peer]
        subscribers.forEach((callback) => callback())
    },
}
