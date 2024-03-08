import { useContext, useEffect, useState } from "react"
import { RoomRecord, ServerReplyData } from "game-signaling-server"
import { LocalPlayer, Room as LobbyRoom } from "./multiplayer-lib"
import SignalingServerContextProvider, {
    SignalingServerContext,
} from "./SignalingServerContext"

const GameList = ({
    selected,
    onSelect,
}: {
    selected: RoomRecord | null
    onSelect: (room: RoomRecord) => void
}) => {
    const { ws, rooms, setRooms } = useContext(SignalingServerContext)

    const handleRoomCreated = (room: RoomRecord) => {
        if (!setRooms) {
            throw new Error("")
        }

        console.debug("Room created", room)
        setRooms((state) => [...state, room])
    }

    const handleRoomDeleted = (room: Pick<RoomRecord, "id">) => {
        if (!setRooms) {
            throw new Error("")
        }

        console.debug("Room deleted", room)
        setRooms((state: RoomRecord[]) => {
            const index = state.findIndex((r) => r.id === room.id)

            if (index !== -1) {
                state.splice(index, 1)
            }

            return [...state]
        })
    }

    useEffect(() => {
        ws?.subscribe({
            "lobby-room-created": handleRoomCreated,
            "lobby-room-deleted": handleRoomDeleted,
        })
    }, [ws])

    // Must request game list on first load
    useEffect(() => {
        if (!setRooms) {
            throw new Error("")
        }

        const queryLobbyRooms = async () => {
            ws?.send("player-list-games")

            type ReplyMessageData = ServerReplyData<"player-list-games-reply">

            const resp = (await ws?.waitForMessage<ReplyMessageData>(
                "player-list-games-reply",
            )) as unknown as { games: RoomRecord[] }

            setRooms(resp.games)
        }

        queryLobbyRooms()
    }, [ws])

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
    const { player, host, join } = useContext(SignalingServerContext)
    const [state, setState] = useState<LobbyState>("browser")

    const handleHost = async () => {
        const resp = await host("My Game", { maxPlayers: 4 })
        if (resp) {
            setState("in-room")
        }
    }

    const handleJoin = async (room: RoomRecord) => {
        const resp = await join(room)
        if (room) {
            setState("in-room")
        }
    }

    let content
    switch (state) {
        case "browser":
            content = <LobbyRoot onHost={handleHost} onJoin={handleJoin} />
            break
        case "hosting":
            content = <RoomInitializer name="My Game" options={{ maxPlayers: 4}} />
            break
        case "joining":
            content = <RoomInitializer id={room.id}
            break
        case "in-room":
            content = <div>room</div> // <Room room={lobby.room} player={player} />
            break

        default:
            break
    }

    return content
}

const LobbyContainer = () => {
    const { connected, connect, disconnect } = useContext(
        SignalingServerContext,
    )

    useEffect(() => {
        connect()

        return () => disconnect()
    }, [connect, disconnect])

    return connected ? <Lobby /> : <div>Connecting...</div>
}

const LobbyBase = () => {
    return (
        <SignalingServerContextProvider>
            <LobbyContainer />
        </SignalingServerContextProvider>
    )
}

export default LobbyBase
