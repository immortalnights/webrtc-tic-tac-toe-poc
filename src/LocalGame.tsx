import { TicTacToeGame } from "./TicTacToeGame"
import { TicTacToeProvider } from "./TicTacToeProvider"
import { PeerConnectionStatus } from "./multiplayer-lib"
import { GameProvider } from "./multiplayer-lib/GameProvider"

export const LocalGame = ({ onLeave }: { onLeave: () => void }) => {
    return (
        <GameProvider>
            <TicTacToeProvider>
                <div>
                    <div>
                        Local Game (<PeerConnectionStatus />)
                    </div>
                    <TicTacToeGame />
                    <div>
                        <button onClick={onLeave}>Leave</button>
                    </div>
                </div>
            </TicTacToeProvider>
        </GameProvider>
    )
}
