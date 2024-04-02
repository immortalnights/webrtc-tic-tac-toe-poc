import { useWebSocket } from "./useWebSocket"

export const ServerStatus = () => {
    const { status, connect, disconnect } = useWebSocket()

    let content
    if (status === "connected") {
        content = (
            <div>
                Connected to multiplayer server{" "}
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        )
    } else if (status === "connecting") {
        content = <div>Connecting to multiplayer server...</div>
    } else if (status === "disconnected") {
        content = (
            <div>
                Not connected to multiplayer server{" "}
                <button onClick={() => connect()}>Connect</button>
            </div>
        )
    }

    return content
}
