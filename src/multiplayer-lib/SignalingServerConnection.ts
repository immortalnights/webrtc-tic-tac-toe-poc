import {
    ClientMessages,
    ServerMessageHandler,
    ServerReplyMessages,
} from "game-signaling-server"

// type ServerMessagesLocal = Omit<ServerMessages, "server-error">

// export type ServerMessageHandlerLocal = {
//     [K in keyof ServerMessagesLocal]: [
//         (data: ServerMessagesLocal[K]["data"]) => void,
//         { once?: boolean } | undefined,
//     ]
// }

export class SignalingServerConnection {
    private ws?: WebSocket
    address: string
    private subscriptions: Partial<ServerMessageHandler>

    constructor(address: string) {
        this.address = address
        this.subscriptions = {}
    }

    get connected() {
        return this.ws?.readyState === WebSocket.OPEN
    }

    // subscribe2<K extends keyof ServerMessagesLocal>(
    //     name: K,
    //     callback: ServerMessageHandlerLocal[K][0],
    //     options?: { once?: boolean },
    // ) {
    //     if (this.subscriptions[name]) {
    //         throw new Error(`Subscription already exists for '${name}'`)
    //     }

    //     this.subscriptions[name] = [callback, options]
    // }

    handleMessageModern = (ev: MessageEvent) => {
        console.debug("Received message", ev.data)

        let data
        try {
            data = JSON.parse(ev.data)
        } catch (error) {
            console.error(`Failed to parse WebSocket message`, ev.data)
        }

        if ("name" in data && "data" in data) {
            const message = data as {
                name: keyof ServerMessages
                data: unknown
            }
            if (this.subscriptions[message.name]) {
                this.subscriptions[message.name](data.data)
            } else {
                console.warn(`Unexpected message received '${data.name}'`)
            }
        }
    }

    subscribe(handlers: Partial<ServerMessageHandler>) {
        this.subscriptions = { ...this.subscriptions, ...handlers }
    }

    // FIXME use message name, not string.
    async waitForMessage<T extends object>(
        name: string,
        timeoutMs: number = 5000,
    ): Promise<T> {
        if (!this.ws) {
            throw new Error(
                "WebSocket has not been initialized, has `connect` been called yet?",
            )
        }

        const ws = this.ws

        return new Promise<T>((resolve, reject) => {
            const messageHandler = (event: MessageEvent) => {
                // parse the new message
                try {
                    const data = JSON.parse(event.data)
                    if (data.name === name) {
                        resolve(data.data) // FIXME use "body" instead?
                        clearTimeout(timeout)
                        ws.removeEventListener("message", messageHandler)
                    }
                } catch (error) {
                    console.error("Failed to parse message", event.data)
                }
            }

            const timeout = setTimeout(() => {
                reject(
                    new Error(`Timeout occurred while waiting for '${name}'`),
                )
                ws.removeEventListener("message", messageHandler)
            }, timeoutMs)

            console.log(`Waiting for message '${name}'...`)
            ws.addEventListener("message", messageHandler)

            ws.addEventListener("close", () => {
                reject(
                    new Error(
                        `WebSocket connection closed while waiting for '${name}'`,
                    ),
                )
                clearTimeout(timeout)
                ws.removeEventListener("message", messageHandler)
            })
        })
    }

    /**
     *FIXME replace with subscription!
     * @param name
     * @returns
     */
    async waitForMessageX<T>(
        name: keyof ServerReplyMessages,
        timeout: number = 30000,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const handleMessage = (ev: MessageEvent) => {
                this.ws?.removeEventListener("error", this.handleError)

                const message = this.handleMessageOLD(ev.data)
                if (message.name === name) {
                    if (message.success) {
                        console.debug(`Received message '${name}'`)
                        resolve(message.data as any)
                    } else {
                        reject(message.error)
                    }
                } else {
                    // console.debug(`Ignored unexpected message ${message.name}`)
                }
            }

            const handlerError = (ev: Event) => {
                this.ws?.removeEventListener("message", handleMessage)
                reject(ev)
            }

            console.debug(`Waiting for '${name}'`)
            this.ws?.addEventListener("message", handleMessage)
            this.ws?.addEventListener("error", handlerError, { once: true })
        })
    }

    /**
     *
     * @param name
     * @returns
     */
    async connect(timeout: number = 30000): Promise<boolean> {
        // FIXME connect with timeout, register, wait for registration response
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://${this.address}/`, [])

            const handleFailedToConnect = (ev: Event) => {
                console.log("WebSocket error", ev)
                reject(ev)
            }

            this.ws.addEventListener(
                "open",
                () => {
                    console.debug("WebSocket opened")

                    if (this.ws) {
                        this.ws.removeEventListener(
                            "error",
                            handleFailedToConnect,
                        )

                        this.ws.addEventListener("error", this.handleErrorBind)
                    }

                    resolve(true)
                },
                { once: true },
            )

            this.ws.addEventListener("message", this.handleMessageModern)

            this.ws.addEventListener(
                "close",
                (code, reason) => {
                    console.log("WebSocket closed", code, reason)
                },
                { once: true },
            )

            this.ws.addEventListener("error", handleFailedToConnect, {
                once: true,
            })
        })
    }

    disconnect() {
        if (this.ws) {
            this.ws.removeAllListeners()
            this.ws.close()
        }
    }

    send<T extends keyof ClientMessages>(
        name: T,
        data?: ClientMessages[T]["data"],
    ) {
        if (this.ws) {
            this.ws.send(
                JSON.stringify({
                    name,
                    data: data,
                }),
            )
        }
    }

    private handleMessageOLD(data: RawData, isBinary: boolean): any {
        console.debug("WebSocket message", data.toString().length, isBinary)

        let json
        try {
            json = JSON.parse(data.toString())
        } catch (err) {}

        return json as any
    }

    private handleMessage(data: MessageEvent): any {
        const message = JSON.parse(data.toString())
        if ("name" in message) {
            console.debug("WS Received", message.name)

            const name = message.name as keyof ServerMessageHandler
            if (this.subscriptions[name]) {
                // Unsure why the check is not preventing the TS error
                this.subscriptions[name]!(message.data as any)
            } else {
                console.debug(`No handler for '${name}'`)
            }
        } else {
            console.error("Message received without a name, discarded")
        }
    }

    private handleError(error: string) {
        console.log("WebSocket error", error)
    }
}
