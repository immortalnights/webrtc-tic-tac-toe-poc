import { useState } from "react"
import "./App.css"
import Lobby from "./Lobby"

type State = "main-menu" | "lobby" | "in-game"

const MainMenu = ({
    onPlay,
    onMultiplayer: onMultiplayer,
}: {
    onPlay: () => void
    onMultiplayer: () => void
}) => {
    return (
        <>
            <h3>Main Menu</h3>

            <div
                style={{
                    display: "flex",
                    gap: "1em",
                    flexDirection: "column",
                }}
            >
                <button onClick={onPlay}>Play</button>
                <button onClick={onMultiplayer}>Multiplayer</button>
            </div>
        </>
    )
}

function App() {
    const [state, setState] = useState<State>("main-menu")

    let content
    switch (state) {
        case "main-menu":
            content = (
                <MainMenu
                    onPlay={() => {}}
                    onMultiplayer={() => setState("lobby")}
                />
            )
            break
        case "lobby":
            // onStart // onLeave
            content = (
                <Lobby
                    onStart={() => setState("in-game")}
                    onLeave={() => setState("main-menu")}
                />
            )
            break
        case "in-game":
            content = <div>Game...</div>
            break
        default:
            break
    }

    return content
}

export default App
