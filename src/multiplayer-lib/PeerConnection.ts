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
        this.pc = new RTCPeerConnection({})
        this.pc.addEventListener("connectionstatechange", (event) => {
            console.debug("pc.connectionstatechange", event)
        })

        this.pc.addEventListener("iceconnectionstatechange", (event) =>
            console.debug("pc.iceConnectionStateChange", event),
        )

        this.pc.addEventListener("datachannel", (event) => {
            console.debug("pc.onDataChannel")
            this.subscribeToDataChannel(event.channel)
        })
    }

    get connected() {
        return (
            this.pc.iceConnectionState === "connected" &&
            this.dc?.readyState === "open"
        )
    }

    subscribe(onMessage: PeerConnectionMessageCallback) {
        this.onMessage = onMessage
    }

    async offer(name: string = "default"): Promise<RTCSessionDescriptionInit> {
        const channel = this.pc.createDataChannel(name, {
            protocol: "default",
        })
        this.subscribeToDataChannel(channel)

        const offer = await this.pc.createOffer()
        await this.pc.setLocalDescription(offer)

        return offer
    }

    async response(answer: RTCSessionDescription) {
        await this.pc.setRemoteDescription(answer)
    }

    async answer(
        offer: RTCSessionDescription,
    ): Promise<RTCSessionDescriptionInit> {
        await this.pc.setRemoteDescription(offer)

        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)

        return answer
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
