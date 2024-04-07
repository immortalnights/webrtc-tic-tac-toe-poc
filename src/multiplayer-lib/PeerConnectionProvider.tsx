import {
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
    throwError,
} from "game-signaling-server"
import { ReactNode, createContext, useCallback, useMemo, useState } from "react"
import { waitFor } from "."

export type ConnectionStatus = "disconnected" | "connecting" | "connected"

interface Connection {
    pc: RTCPeerConnection
    dc: RTCDataChannel | undefined
    status: ConnectionStatus
}

interface ConnectionMap {
    [peer: string]: Connection
}

export type OnMessageHandler = (
    peer: string,
    data: { name: string; body: object },
) => void

export interface PeerConnectionContextValue {
    connections: ConnectionMap
    // Host offer
    offer: (
        peer: string,
        name?: string,
    ) => Promise<{
        offer: RTCSessionDescriptionInit
        candidates: RTCIceCandidate[]
    }>
    // Client reply
    reply: (peer: string, answer: RTCSessionDescriptionLike) => Promise<void>
    // Client answer
    answer: (
        offer: RTCSessionDescriptionLike,
        candidates: RTCIceCandidateLike[],
    ) => Promise<RTCSessionDescriptionInit>
    send: (name: string, body: object, target?: string) => void
    subscribe: (cb: OnMessageHandler) => void
    close: (peer: string) => void
}

export const PeerConnectionContext = createContext<PeerConnectionContextValue>({
    connections: {},
    offer: () => {
        return Promise.reject(
            new Error("Missing Peer Connection Context Provider"),
        )
    },
    reply: () => {
        return Promise.reject(
            new Error("Missing Peer Connection Context Provider"),
        )
    },
    answer: () => {
        return Promise.reject(
            new Error("Missing Peer Connection Context Provider"),
        )
    },
    send: () => console.error(""),
    subscribe: () => console.error(""),
    close: () => console.error(""),
})

export const PeerConnectionProvider = ({
    children,
}: {
    children: ReactNode
}) => {
    const [connections, setConnections] = useState<ConnectionMap>({})

    const subscribeToDataChannel = useCallback(
        (peer: string, channel: RTCDataChannel) => {
            channel.addEventListener(
                "open",
                (ev) => {
                    console.debug("dc.open", ev)
                    setConnections((state) => ({
                        ...state,
                        [peer]: { ...state[peer], status: "connected" },
                    }))
                },
                { once: true },
            )

            channel.addEventListener(
                "close",
                (ev) => {
                    console.debug("dc.close", ev)
                    setConnections((state) => ({
                        ...state,
                        [peer]: { ...state[peer], status: "disconnected" },
                    }))

                    channel.removeEventListener("error", console.error)
                },
                { once: true },
            )

            channel.addEventListener("error", console.error)
        },
        [],
    )

    const offer = useCallback(
        async (peer: string, name: string = "default") => {
            const pc = new RTCPeerConnection()
            const dc = pc.createDataChannel(name, {
                protocol: "default",
            })
            subscribeToDataChannel(peer, dc)

            console.debug("Creating RTC offer")
            const offer = await pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            })
            await pc.setLocalDescription(offer)

            const candidates: RTCIceCandidate[] = []
            const onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate) {
                    candidates.push(event.candidate)
                }
            }

            pc.addEventListener("icecandidate", onIceCandidate)
            await waitFor(() => pc.iceGatheringState === "complete")
            pc.removeEventListener("icecandidate", onIceCandidate)

            console.debug(`Setup connection for peer ${peer}`)
            setConnections((state) => ({
                ...state,
                [peer]: { ...state[peer], pc, dc, status: "connecting" },
            }))

            console.debug("Completed offer", offer, candidates)
            return { offer, candidates }
        },
        [subscribeToDataChannel],
    )

    const reply = useCallback(
        async (peer: string, answer: RTCSessionDescriptionLike) => {
            console.assert(
                answer && "type" in answer && answer.type === "answer",
                "Invalid RTCSessionDescription for reply",
            )

            const connection =
                connections[peer] ??
                throwError(`Failed to get connection for peer ${peer}`)

            console.debug("Received reply", answer)
            return connection.pc.setRemoteDescription(
                answer as RTCSessionDescriptionInit,
            )
        },
        [connections],
    )

    const answer = useCallback(
        async (
            offer: RTCSessionDescriptionLike,
            candidates?: RTCIceCandidateLike[],
        ) => {
            console.assert(
                offer && "type" in offer && offer.type === "offer",
                "Invalid RTCSessionDescription for answer",
            )

            const pc = new RTCPeerConnection()
            console.debug(`Setup connection for host`)
            setConnections((state) => ({
                ...state,
                ["host"]: {
                    ...state["host"],
                    pc,
                    dc: undefined,
                    status: "connecting",
                },
            }))

            const onDataChannel = (event: RTCDataChannelEvent) => {
                console.debug("pc.onDataChannel")
                subscribeToDataChannel("host", event.channel)

                setConnections((state) => ({
                    ...state,
                    ["host"]: { ...state["host"], dc: event.channel },
                }))
            }

            pc.addEventListener("datachannel", onDataChannel, { once: true })

            console.debug("Received offer", offer, candidates)
            await pc.setRemoteDescription(offer as RTCSessionDescriptionInit)

            console.debug("Creating RTC answer")
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            if (candidates && candidates.length > 0) {
                await Promise.allSettled(
                    candidates.map((candidate) =>
                        pc.addIceCandidate(candidate),
                    ),
                )
            }

            console.debug("Completed answer", answer)
            return answer
        },
        [subscribeToDataChannel],
    )

    const send = useCallback(
        (name: string, body: object, target?: string) => {
            const data = JSON.stringify({
                name,
                body,
            })
            Object.entries(connections).forEach(([peer, connection]) => {
                if (!target || target === peer) {
                    connection.dc?.send(data)
                }
            })
        },
        [connections],
    )

    const subscribe = useCallback(
        (callback: OnMessageHandler) => {
            Object.entries(connections).forEach(([peer, connection]) => {
                if (!connection.dc) {
                    throw new Error(
                        "Cannot subscribe before the channel has connected",
                    )
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onMessage = (event: MessageEvent<any>) => {
                    console.debug("Received peer message", event.data)
                    const json = JSON.parse(event.data.toString())
                    if (callback && "name" in json) {
                        callback(peer, json)
                    }
                }

                connection.dc.addEventListener("message", onMessage)
                connection.dc.addEventListener(
                    "close",
                    () => {
                        connection.dc?.removeEventListener("message", onMessage)
                    },
                    { once: true },
                )
            })
        },
        [connections],
    )

    const close = useCallback((peer: string) => {
        setConnections((state) => {
            let newState = state
            if (state[peer]) {
                state[peer].dc?.removeEventListener
                state[peer].dc?.close()
                state[peer].pc?.close()
                state[peer].status = "disconnected"

                newState = { ...state }
                delete newState[peer]
            }

            return newState
        })
    }, [])

    const value = useMemo(
        () => ({
            connections,
            offer,
            reply,
            answer,
            send,
            subscribe,
            close,
        }),
        [connections, offer, reply, answer, send, subscribe, close],
    )

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )
}
