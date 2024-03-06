import {
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
} from "game-signaling-server"
import { waitFor } from "."

export interface PeerMessage {
    name: string
    player?: string
    data?: object
}

export type PeerConnectionMessageCallback = (data: PeerMessage) => void

export class PeerConnection {
    pc: RTCPeerConnection
    private dc?: RTCDataChannel
    private onMessage?: PeerConnectionMessageCallback

    constructor() {
        this.pc = new RTCPeerConnection({ bundlePolicy: "balanced" })

        // debug logging
        this.pc.addEventListener("icecandidateerror", (e) =>
            console.debug("icecandidateerror", e),
        )
        this.pc.addEventListener("icegatheringstatechange", (e) =>
            console.debug("icegatheringstatechange", e),
        )
        this.pc.addEventListener("negotiationneeded", (e) =>
            console.debug("negotiationneeded", e),
        )
        this.pc.addEventListener("signalingstatechange", (e) =>
            console.debug("signalingstatechange", e),
        )
        this.pc.addEventListener("track", (e) => console.debug("track", e))

        this.pc.addEventListener("connectionstatechange", (event) => {
            console.debug("pc.connectionstatechange", event)
        })

        this.pc.addEventListener("iceconnectionstatechange", (event) =>
            console.debug("pc.iceConnectionStateChange", event),
        )
        // end debug

        this.pc.addEventListener("datachannel", (event) => {
            console.debug("pc.onDataChannel")
            this.subscribeToDataChannel(event.channel)
        })
    }

    get connected() {
        return (
            this.pc.connectionState === "connected" &&
            this.pc.iceConnectionState === "connected" &&
            this.dc?.readyState === "open"
        )
    }

    subscribe(onMessage: PeerConnectionMessageCallback) {
        this.onMessage = onMessage
    }

    async offer(name: string = "default"): Promise<{
        offer: RTCSessionDescriptionInit
        iceCandidates: RTCIceCandidate[]
    }> {
        const channel = this.pc.createDataChannel(name, {
            protocol: "default",
        })
        this.subscribeToDataChannel(channel)

        const offer = await this.pc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        })
        await this.pc.setLocalDescription(offer)

        const iceCandidates: RTCIceCandidate[] = []
        this.pc.addEventListener("icecandidate", (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate)
            }
        })

        await waitFor(() => this.pc.iceGatheringState === "complete")

        return { offer, iceCandidates }
    }

    async response(answer: object) {
        console.assert(
            "type" in answer && answer.type === "answer",
            "Invalid RTCSessionDescription for response",
        )

        await this.pc.setRemoteDescription(answer as RTCSessionDescriptionInit)
    }

    async answer(
        offer: RTCSessionDescriptionLike,
    ): Promise<RTCSessionDescriptionInit> {
        console.assert(
            "type" in offer && offer.type === "offer",
            "Invalid RTCSessionDescription for answer",
        )

        await this.pc.setRemoteDescription(offer as RTCSessionDescriptionInit)

        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)

        return answer
    }

    async setIceCandidates(iceCandidates: RTCIceCandidateLike[]) {
        console.debug(`Setting ICE candidates ${iceCandidates.length}`)
        return Promise.allSettled(
            iceCandidates.map((candidate) =>
                this.pc.addIceCandidate(candidate),
            ),
        )
    }

    send(data: object | string | ArrayBuffer) {
        this.dc?.send(data instanceof Object ? JSON.stringify(data) : data)
    }

    close() {
        this.pc.close()
    }

    private subscribeToDataChannel(channel: RTCDataChannel) {
        this.dc = channel

        this.dc.addEventListener("open", (ev) => {
            console.log("dc.open", ev)
        })

        this.dc.addEventListener("close", (ev) => {
            console.log("dc.open", ev)
        })

        this.dc.addEventListener("message", (data) => {
            const json = JSON.parse(data.toString())
            if ("name" in json) {
                this.onMessage?.(json as PeerMessage)
            }
        })

        this.dc.addEventListener("error", console.error)
    }
}
