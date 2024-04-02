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
    send: (peer: string, data: object | string | ArrayBuffer) => void
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
    close: () => console.error(""),
})

export const PeerConnectionProvider = ({
    children,
}: {
    children: ReactNode
}) => {
    const [connections, setConnections] = useState<ConnectionMap>({})

    const subscribeToDataChannel = (peer: string, channel: RTCDataChannel) => {
        channel.addEventListener("open", (ev) => {
            console.log("dc.open", ev)
            setConnections((state) => ({
                ...state,
                [peer]: { ...state[peer], status: "connected" },
            }))
        })

        channel.addEventListener("close", (ev) => {
            console.log("dc.close", ev)
            setConnections((state) => ({
                ...state,
                [peer]: { ...state[peer], status: "disconnected" },
            }))
        })

        channel.addEventListener("message", (event) => {
            console.debug("Received peer message", event)
            // const json = JSON.parse(data.toString())
            // if ("name" in json) {
            //     this.onMessage?.(json as PeerMessage)
            // }
        })

        channel.addEventListener("error", console.error)
    }

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
            pc.addEventListener("icecandidate", (event) => {
                if (event.candidate) {
                    candidates.push(event.candidate)
                }
            })

            await waitFor(() => pc.iceGatheringState === "complete")

            console.debug(`Setup connection for peer ${peer}`)
            setConnections((state) => ({
                ...state,
                [peer]: { ...state[peer], pc, dc, status: "connecting" },
            }))

            console.debug("Completed offer", offer, candidates)
            return { offer, candidates }
        },
        [],
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

            pc.addEventListener("datachannel", (event) => {
                console.debug("pc.onDataChannel")
                subscribeToDataChannel("host", event.channel)

                setConnections((state) => ({
                    ...state,
                    ["host"]: { ...state["host"], dc: event.channel },
                }))
            })

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
        [],
    )

    const send = useCallback(() => {}, [])

    const close = useCallback((peer: string) => {
        setConnections((state) => {
            let newState = state
            if (state[peer]) {
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
            close,
        }),
        [connections, offer, reply, answer, send, close],
    )

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )
}
