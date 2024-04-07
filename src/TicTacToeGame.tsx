import { useTicTacToe } from "./useTicTacToe"

type SquareValue = "X" | "O" | undefined

const Square = ({
    value,
    onClick,
}: {
    value: SquareValue
    onClick: () => void
}) => {
    const squareStyle: React.CSSProperties = {
        fontSize: "24px",
        width: "100px",
        height: "100px",
        border: "1px solid darkgray",
        borderRadius: 0,
        background: "transparent",
    }

    return (
        <button style={squareStyle} onClick={onClick}>
            {value}
        </button>
    )
}

const Board = ({
    squares,
    onClick,
}: {
    squares: SquareValue[]
    onClick: (position: number) => void
}) => {
    const boardStyle: React.CSSProperties = {
        display: "inline-grid",
        gridTemplateColumns: "repeat(3, 100px)",
        gridGap: "0px",
        margin: 20,
    }

    const renderSquare = (position: number) => {
        return (
            <Square
                value={squares[position]}
                onClick={() => onClick(position)}
            />
        )
    }

    return (
        <div style={boardStyle}>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {renderSquare(0)}
                {renderSquare(1)}
                {renderSquare(2)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {renderSquare(3)}
                {renderSquare(4)}
                {renderSquare(5)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {renderSquare(6)}
                {renderSquare(7)}
                {renderSquare(8)}
            </div>
        </div>
    )
}

export const TicTacToeGame = () => {
    const { spaces, token, turn, takeTurn } = useTicTacToe()

    const handleClick = (position: number) => {
        if (token === turn) {
            takeTurn(position)
        } else {
            console.error("Not this players turn!")
        }
    }

    return <Board squares={spaces} onClick={handleClick} />
}
