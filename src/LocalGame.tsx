import { TicTacToeGame } from "./TicTacToeGame"
import { TicTacToeProvider } from "./TicTacToeProvider"
import {
    PeerConnectionStatus,
    useManager,
    usePeerConnection,
    useWebSocket,
} from "./multiplayer-lib"
import { GameProvider } from "./multiplayer-lib/GameProvider"

export const LocalGame = () => {
    const { leaveGame } = useManager()
    const { send } = useWebSocket()
    const { close } = usePeerConnection()

    const handleLeave = () => {
        close()
        send("player-leave-room", undefined)
        leaveGame()
    }

    return (
        <GameProvider>
            <TicTacToeProvider>
                <div>
                    <div>
                        Local Game (<PeerConnectionStatus />)
                    </div>
                    <TicTacToeGame />
                    <div>
                        <button onClick={handleLeave}>Leave</button>
                    </div>
                </div>
            </TicTacToeProvider>
        </GameProvider>
    )
}
