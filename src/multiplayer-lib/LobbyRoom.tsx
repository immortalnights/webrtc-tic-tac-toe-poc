import {
    PlayerRecord,
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
    RoomRecord,
    throwError,
} from "game-signaling-server"
import { useState, useCallback, useEffect } from "react"
import {
    useManager,
    useWebSocket,
    usePeerConnection,
    PeerConnectionStatus,
} from "."
import { WebSocketMessageHandler } from "./WebSocket/types"

const ReadyStateToggle = ({ player }: { player: PlayerRecord }) => {
    const { send } = useWebSocket()

    const handleToggleReady = useCallback(() => {
        send("player-change-ready-state", {
            id: player?.id,
            ready: !player?.ready,
        })
    }, [send, player])

    return (
        <input
            type="checkbox"
            title="Toggle ready"
            aria-label={player.ready ? "Set ready" : "Set not ready"}
            checked={player.ready}
            onChange={handleToggleReady}
        />
    )
}

const ReadyState = ({ player }: { player: PlayerRecord }) => {
    return player.ready ? "Ready" : "Not Ready"
}

const PlayerItem = ({
    localPlayer,
    player,
}: {
    localPlayer: PlayerRecord
    player: PlayerRecord
}) => {
    return (
        <div
            key={player.id}
            style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
            }}
        >
            <div style={{ flexGrow: 1, textAlign: "left" }}>
                {localPlayer?.id === player.id ? "*" : " "}
                {player.name}
            </div>
            <div style={{ paddingRight: 10 }}>
                <PeerConnectionStatus remotePlayerId={player.id} />
            </div>
            <div>
                {localPlayer?.id === player.id ? (
                    <ReadyStateToggle player={player} />
                ) : (
                    <ReadyState player={player} />
                )}
            </div>
        </div>
    )
}

export const LobbyRoom = ({
    localPlayerId,
    room: initialRoom,
}: {
    localPlayerId: string
    room: RoomRecord
}) => {
    const { joinGame, leaveRoom } = useManager()
    const { subscribe, unsubscribe, send } = useWebSocket()
    const [room, setRoom] = useState<RoomRecord>(initialRoom)
    const { offer, reply, answer, close } = usePeerConnection()

    const localPlayer =
        room?.players.find((item) => item.id === localPlayerId) ??
        throwError("Failed to find local player in Lobby Room")
    const canStartGame =
        room?.players &&
        localPlayer?.host &&
        room.players.length >= (room.options.minPlayers ?? 2) &&
        room.players.every((p) => p.ready)

    const handleHostStartGame = useCallback(() => {
        if (localPlayer?.host) {
            send("player-start-game", {
                // FIXME should not be required
                id: localPlayer?.id,
            })
            // FIXME Should receive reply?
        }
    }, [send, localPlayer])

    const onStart = useCallback(joinGame, [joinGame])

    const onClose = useCallback(() => {
        send("player-leave-room", undefined)
        leaveRoom()
    }, [send, leaveRoom])

    useEffect(() => {
        const handlePlayerConnected = async (otherPlayer: PlayerRecord) => {
            console.debug(`Player joined room ${otherPlayer.id}`)
            setRoom((state) => ({
                ...state,
                players: [...state.players, otherPlayer],
            }))

            if (localPlayer?.host) {
                const { offer: sessionDescription, candidates } = await offer(
                    otherPlayer.id,
                )
                send("player-connect-to-peer", {
                    peer: otherPlayer.id,
                    offer: sessionDescription,
                    candidates,
                })
            }
        }

        const handlePlayerDisconnected = (
            otherPlayer: Pick<PlayerRecord, "id" | "name">,
        ) => {
            console.debug(`Player disconnected ${otherPlayer.id}`)
            close(otherPlayer.id)
            setRoom((state) => ({
                ...state,
                players: state.players.filter(
                    (item) => item.id !== otherPlayer.id,
                ),
            }))
        }

        const handlePlayerReadyChange = (
            otherPlayer: Pick<PlayerRecord, "id" | "ready">,
        ) => {
            setRoom((state) => {
                const playerRecord = state.players.find(
                    (item) => item.id === otherPlayer.id,
                )

                let newState
                if (playerRecord) {
                    const index = state.players.indexOf(playerRecord)
                    newState = { ...state, players: [...state.players] }
                    newState.players[index] = {
                        ...newState.players[index],
                        ready: otherPlayer.ready,
                    }
                } else {
                    newState = state
                }
                return newState
            })
        }

        const handleStartGame = ({
            room,
            game,
        }: {
            room: string
            game: string
        }) => onStart(game)

        const handleRoomClosed = () => onClose()

        const handleConnectToHost = async ({
            id,
            sessionDescription,
            candidates,
        }: {
            id: string
            sessionDescription: RTCSessionDescriptionLike
            candidates: RTCIceCandidateLike[]
        }) => {
            console.debug(`Connect to host (${id})`)
            const answerSessionDescription = await answer(
                sessionDescription,
                candidates,
            )
            send("player-connect-to-host", {
                answer: answerSessionDescription,
            })
        }

        const handleConnectToPeerReply = async ({
            id,
            sessionDescription,
        }: {
            id: string
            sessionDescription: RTCSessionDescriptionLike
        }) => {
            console.debug(`Connect to peer reply (${id})`)
            await reply(id, sessionDescription)
        }

        const subscriptions = {
            "room-player-connected": handlePlayerConnected,
            "room-player-disconnected": handlePlayerDisconnected,
            "room-player-ready-change": handlePlayerReadyChange,
            "room-player-rtc-host-offer": handleConnectToHost,
            "room-player-rtc-answer": handleConnectToPeerReply,
            "room-start-game": handleStartGame,
            "room-closed": handleRoomClosed,
        }

        const handleSocketMessage: WebSocketMessageHandler = ({
            name,
            body,
        }) => {
            if (Object.keys(subscriptions).includes(name)) {
                const key = name as keyof typeof subscriptions
                subscriptions[key](body as never)
            }
        }

        subscribe(handleSocketMessage)

        return () => {
            unsubscribe(handleSocketMessage)
        }
    }, [
        localPlayer?.host,
        offer,
        answer,
        reply,
        close,
        send,
        subscribe,
        unsubscribe,
        onStart,
        onClose,
    ])

    return (
        <div>
            <div>Room {room.name}</div>
            <div style={{ minWidth: 400 }}>
                {room.players.map((player) => (
                    <PlayerItem
                        key={player.id}
                        localPlayer={localPlayer}
                        player={player}
                    />
                ))}
            </div>
            <div>
                <button onClick={onClose}>Leave</button>
                {localPlayer?.host && (
                    <button
                        disabled={!canStartGame}
                        onClick={handleHostStartGame}
                    >
                        Start
                    </button>
                )}
            </div>
        </div>
    )
}
