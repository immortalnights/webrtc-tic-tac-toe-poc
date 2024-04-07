import {
    PlayerRecord,
    RTCIceCandidateLike,
    RTCSessionDescriptionLike,
    RoomRecord,
} from "game-signaling-server"
import { useState, useCallback, useSyncExternalStore } from "react"
import { usePeerConnection } from "./usePeerConnection"
import { PeerConnectionStatus } from "./PeerConnectionStatus"
import { useWebSocket } from "./useWebSocket"
import { useManager } from "."

const useSyncRoom = ({
    localPlayerId,
    initialRoom,
}: {
    localPlayerId: string
    initialRoom: RoomRecord
}) => {
    const { leaveRoom, joinGame } = useManager()
    const { subscribe, unsubscribe, send } = useWebSocket()
    const { offer, reply, answer, close } = usePeerConnection()
    const [room, setRoom] = useState<RoomRecord>(initialRoom)

    const localPlayer = room.players.find((item) => item.id === localPlayerId)

    const subscribeToSocket = useCallback(() => {
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

        const handleStartGame = (_room: string, game: string) => joinGame(game)

        const handleRoomClosed = () => leaveRoom()

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

        console.debug("!Subscribe")
        const subscriptions = {
            "room-player-connected": handlePlayerConnected,
            "room-player-disconnected": handlePlayerDisconnected,
            "room-player-ready-change": handlePlayerReadyChange,
            "room-player-rtc-host-offer": handleConnectToHost,
            "room-player-rtc-answer": handleConnectToPeerReply,
            "room-start-game": handleStartGame,
            "room-closed": handleRoomClosed,
        }

        Object.entries(subscriptions).forEach(([name, callback]) => {
            subscribe(name, callback)
        })

        return () => {
            console.debug("!Unsubscribe")

            Object.entries(subscriptions).forEach(([name, callback]) => {
                unsubscribe(name, callback)
            })
        }
    }, [
        answer,
        close,
        joinGame,
        leaveRoom,
        localPlayer?.host,
        offer,
        reply,
        send,
        subscribe,
        unsubscribe,
    ])

    const getSnapshot = useCallback(() => room, [room])

    return useSyncExternalStore(subscribeToSocket, getSnapshot)
}

export const LobbyRoom = ({
    localPlayerId,
    room: initialRoom,
    onLeave,
}: {
    localPlayerId: string
    room: RoomRecord
    onLeave: () => void
}) => {
    const { send } = useWebSocket()
    const room = useSyncRoom({ localPlayerId, initialRoom })

    const localPlayer = room.players.find((item) => item.id === localPlayerId)
    const canStartGame = localPlayer?.host && room.players.every((p) => p.ready)

    const handleToggleReady = useCallback(() => {
        send("player-change-ready-state", {
            id: localPlayer?.id,
            ready: !localPlayer?.ready,
        })
    }, [send, localPlayer])

    const handleHostStartGame = useCallback(() => {
        if (localPlayer?.host) {
            send("player-start-game", {
                // FIXME should not be required
                id: localPlayer?.id,
            })
        }
    }, [send, localPlayer])

    return (
        <div>
            <div>Room {room.name}</div>
            <div>
                {room.players.map((player) => (
                    <div
                        key={player.id}
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        <div>{player.ready ? "Ready" : "Not Ready"}</div>
                        <div style={{ flexGrow: 1 }}>{player.name}</div>
                        <div>
                            <PeerConnectionStatus remotePlayerId={player.id} />
                        </div>
                        <div>
                            {localPlayer?.id === player.id ? (
                                <input
                                    type="checkbox"
                                    title="Toggle ready"
                                    aria-label={
                                        player.ready
                                            ? "Set ready"
                                            : "Set not ready"
                                    }
                                    checked={player.ready}
                                    onChange={handleToggleReady}
                                />
                            ) : (
                                ""
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div>
                <button onClick={onLeave}>Leave</button>
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
