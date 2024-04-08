import {
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
    throwError,
} from "game-signaling-server"
import {
    ReactNode,
    createContext,
    useCallback,
    useMemo,
    useSyncExternalStore,
} from "react"
import { waitFor } from ".."
import { peerConnectionStore } from "./store"
import { ConnectionMap, DataChannelMessageHandler } from "./types"

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
    subscribe: (cb: DataChannelMessageHandler) => void
    unsubscribe: (cb: DataChannelMessageHandler) => void
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
    unsubscribe: () => console.error(""),
    close: () => console.error(""),
})

export const PeerConnectionProvider = ({
    children,
}: {
    children: ReactNode
}) => {
    const store = useSyncExternalStore(
        peerConnectionStore.subscribe,
        peerConnectionStore.getConnections,
    )

    const offer = useCallback(
        async (peer: string, name: string = "default") => {
            const pc = new RTCPeerConnection()
            const dc = pc.createDataChannel(name, {
                protocol: "default",
            })

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

            peerConnectionStore.addConnection(peer, pc, dc)

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
                peerConnectionStore.find(peer) ??
                throwError(`Failed to get connection for peer ${peer}`)

            console.debug("Received reply", answer)
            return connection.pc.setRemoteDescription(
                answer as RTCSessionDescriptionInit,
            )
        },
        [],
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
            peerConnectionStore.addConnection("host", pc)

            pc.addEventListener(
                "datachannel",
                (event: RTCDataChannelEvent) => {
                    console.debug("pc.onDataChannel")
                    peerConnectionStore.setDataChannel("host", event.channel)
                },
                { once: true },
            )

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

    const send = useCallback((name: string, body: object, target?: string) => {
        const message = {
            name,
            body,
        }

        if (target) {
            peerConnectionStore.sendTo(target, message)
        } else {
            peerConnectionStore.sendToAll(message)
        }
    }, [])

    const subscribe = useCallback((callback: DataChannelMessageHandler) => {
        peerConnectionStore.setMessageCallback(callback)
    }, [])

    const unsubscribe = useCallback((callback: DataChannelMessageHandler) => {
        peerConnectionStore.removeMessageCallback(callback)
    }, [])

    const close = useCallback((peer: string) => {
        peerConnectionStore.removeConnection(peer)
    }, [])

    const value = useMemo(
        () => ({
            connections: store,
            offer,
            reply,
            answer,
            send,
            subscribe,
            unsubscribe,
            close,
        }),
        [store, offer, reply, answer, send, subscribe, unsubscribe, close],
    )

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )
}
