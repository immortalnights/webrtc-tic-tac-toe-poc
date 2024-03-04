import { useContext, useEffect, useState } from "react"
import { LobbyContext } from "./LobbyProvider"
import LobbyProvider from "./LobbyProvider"
import { RoomRecord } from "game-signaling-server"

const PeerConnectionStatus = () => {
    const { player } = useContext(LobbyContext)
    const [status, setStatus] = useState("unknown")

    useEffect(() => {
        let timeout: number | undefined
        const updateStatus = () => {
            if (!player) {
                setStatus("Invalid player")
            } else if (!player.peerConnection) {
                setStatus("Invalid peer connection")
            } else if (player.peerConnection.connected) {
                setStatus("Peer connected")
            } else {
                setStatus("Peer disconnected")
            }

            timeout = window.setTimeout(updateStatus, 1000)
        }

        timeout = window.setTimeout(updateStatus, 1000)

        return () => {
            if (timeout) {
                window.clearTimeout(timeout)
            }
        }
    }, [player, player?.peerConnection])

    return <div>Peer: {status}</div>
}

const GameList = ({
    selected,
    onSelect,
}: {
    selected: RoomRecord | null
    onSelect: (room: RoomRecord) => void
}) => {
    const { lobby } = useContext(LobbyContext)
    const [rooms, setRooms] = useState<RoomRecord[]>([])

    if (!lobby) {
        throw new Error("")
    }

    // FIXME should subscribe, not request

    useEffect(() => {
        const queryLobbyRooms = async () => {
            const resp = await lobby.list()
            setRooms(resp)
        }

        queryLobbyRooms()
    }, [lobby])

    return (
        <div style={{}}>
            {rooms.length > 0
                ? rooms.map((room) => (
                      <div
                          key={room.id}
                          style={{
                              borderStyle: "solid",
                              borderColor: selected ? "#646cff" : "black",
                              borderWidth: "1px",
                          }}
                          onClick={() => onSelect(room)}
                      >
                          {room.name}
                      </div>
                  ))
                : "No rooms"}
        </div>
    )
}

const LobbyRoot = ({
    onHost,
    onJoin,
}: {
    onHost: () => void
    onJoin: (room: RoomRecord) => void
}) => {
    const [selected, setSelected] = useState<RoomRecord | null>(null)

    const handleSelect = (room: RoomRecord) => {
        setSelected(room)
    }

    const handleJoin = () => {
        if (!selected) {
            throw new Error("")
        }

        onJoin(selected)
    }

    return (
        <>
            <h3>Lobby</h3>
            <div>Available Games</div>
            <GameList selected={selected} onSelect={handleSelect} />
            <hr />
            <div
                style={{
                    display: "flex",
                    gap: "1em",
                    flexDirection: "row",
                }}
            >
                <button onClick={onHost}>Host</button>
                <button disabled={!selected} onClick={handleJoin}>
                    Join
                </button>
            </div>
        </>
    )
}

type LobbyState = "browser" | "joining" | "in-room"

const Lobby = () => {
    const { lobby } = useContext(LobbyContext)
    const [state, setState] = useState<LobbyState>("browser")

    if (!lobby) {
        throw new Error("")
    }

    const handleHost = async () => {
        const resp = await lobby.host("My Game", { maxPlayers: 4 })
        if (resp) {
            setState("in-room")
        }
    }

    const handleJoin = async (room: RoomRecord) => {
        const resp = await lobby.join(room)
        if (room) {
            setState("in-room")
        }
    }

    let content
    switch (state) {
        case "browser":
            content = <LobbyRoot onHost={handleHost} onJoin={handleJoin} />
            break
        case "joining":
            break
        case "in-room":
            content = (
                <div>
                    <PeerConnectionStatus />
                    in room {lobby.room?.name}
                </div>
            )
            break

        default:
            break
    }

    return content
}

const LobbyContainer = () => {
    const { connected, connect } = useContext(LobbyContext)

    useEffect(() => {
        connect()
    }, [])

    return connected ? <Lobby /> : <div>Connecting...</div>
}

const LobbyBase = () => {
    return (
        <LobbyProvider>
            <LobbyContainer />
        </LobbyProvider>
    )
}

export default LobbyBase
