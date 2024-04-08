import { useWebSocket } from "."

export const ConnectionState = () => {
    const { state, connect, disconnect } = useWebSocket()

    let content
    if (state === "connected") {
        content = (
            <div>
                Connected to multiplayer server{" "}
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        )
    } else if (state === "connecting") {
        content = <div>Connecting to multiplayer server...</div>
    } else if (state === "disconnected") {
        content = (
            <div>
                Not connected to multiplayer server{" "}
                <button onClick={() => connect()}>Connect</button>
            </div>
        )
    }

    return content
}
