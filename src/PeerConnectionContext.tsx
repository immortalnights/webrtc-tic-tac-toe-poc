import {
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
} from "game-signaling-server"
import {
    ReactNode,
    createContext,
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react"
import { waitFor } from "./multiplayer-lib"

export interface PeerConnectionContextValue {
    connected: boolean
    // Host offer
    offer: (name?: string) => Promise<{
        offer: RTCSessionDescriptionInit
        iceCandidates: RTCIceCandidate[]
    }>
    // Client response
    response: (answer: RTCSessionDescriptionLike) => Promise<void>
    // Client answer
    answer: (
        offer: RTCSessionDescriptionLike,
        iceCandidates: RTCIceCandidateLike[],
    ) => Promise<RTCSessionDescriptionInit>
    send: (data: object | string | ArrayBuffer) => void
    close: () => void
}

export const PeerConnectionContext = createContext<PeerConnectionContextValue>({
    connected: false,
    offer: () => {
        console.error("")
        return Promise.reject()
    },
    response: () => {
        console.error("")
        return Promise.reject()
    },
    answer: () => {
        console.error("")
        return Promise.reject()
    },
    send: () => console.error(""),
    close: () => console.error(""),
})

const PeerConnectionContextProvider = ({
    children,
}: {
    children: ReactNode
}) => {
    const pc = useRef(new RTCPeerConnection())
    const dc = useRef<RTCDataChannel | null>(null)
    const [connected, setConnected] = useState(false)

    const subscribeToDataChannel = (channel: RTCDataChannel) => {
        channel.addEventListener("open", (ev) => {
            console.log("dc.open", ev)
            setConnected(true)
        })

        channel.addEventListener("close", (ev) => {
            console.log("dc.close", ev)
            setConnected(false)
        })

        channel.addEventListener("message", (event) => {
            console.debug("Received peer message", event)
            // const json = JSON.parse(data.toString())
            // if ("name" in json) {
            //     this.onMessage?.(json as PeerMessage)
            // }
        })

        channel.addEventListener("error", console.error)

        dc.current = channel
    }

    pc.current.addEventListener("datachannel", (event) => {
        console.debug("pc.onDataChannel")
        subscribeToDataChannel(event.channel)
    })

    const offer = useCallback(
        async (name: string = "default") => {
            const channel = pc.current.createDataChannel(name, {
                protocol: "default",
            })
            subscribeToDataChannel(channel)

            const offer = await pc.current.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            })
            await pc.current.setLocalDescription(offer)

            const iceCandidates: RTCIceCandidate[] = []
            pc.current.addEventListener("icecandidate", (event) => {
                if (event.candidate) {
                    iceCandidates.push(event.candidate)
                }
            })

            await waitFor(() => pc.current.iceGatheringState === "complete")

            return { offer, iceCandidates }
        },
        [pc],
    )

    const response = useCallback(async (answer: RTCSessionDescriptionLike) => {
        console.assert(
            "type" in answer && answer.type === "answer",
            "Invalid RTCSessionDescription for response",
        )

        await pc.current.setRemoteDescription(
            answer as RTCSessionDescriptionInit,
        )
    }, [])

    const answer = useCallback(
        async (
            offer: RTCSessionDescriptionLike,
            iceCandidates: RTCIceCandidateLike[],
        ) => {
            console.assert(
                "type" in offer && offer.type === "offer",
                "Invalid RTCSessionDescription for answer",
            )

            await pc.current.setRemoteDescription(
                offer as RTCSessionDescriptionInit,
            )

            const answer = await pc.current.createAnswer()
            await pc.current.setLocalDescription(answer)

            await Promise.allSettled(
                iceCandidates.map((candidate) =>
                    pc.current.addIceCandidate(candidate),
                ),
            )

            return answer
        },
        [],
    )

    const send = useCallback(() => {}, [])

    const close = useCallback(() => {}, [])

    const value = useMemo(
        () => ({
            connected,
            offer,
            response,
            answer,
            send,
            close,
        }),
        [connected, offer, response, answer, send, close],
    )

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )
}

export default PeerConnectionContextProvider
