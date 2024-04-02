import {
    RenderOptions,
    render as reactRender,
    screen,
} from "@testing-library/react"
import { expect, test } from "vitest"
import { ReactElement, useEffect } from "react"
import { useWebSocket } from "./useWebSocket"
import { WebSocketProvider } from "./WebSocketProvider"

const render = (ui: ReactElement, options: RenderOptions = {}) => {
    return reactRender(ui, { wrapper: WebSocketProvider, ...options })
}

test("Disconnected", () => {
    const Component = () => {
        const { status } = useWebSocket()

        return <div>{status}</div>
    }
    render(<Component />)
    expect(screen.getByText("disconnected")).toBeInTheDocument()
})

test("Connecting", () => {
    const Component = () => {
        const { status, connect } = useWebSocket()

        useEffect(() => {
            connect()
        }, [connect])

        return <div>{status}</div>
    }
    render(<Component />)
    expect(screen.getByText("connecting")).toBeInTheDocument()
})

test("Connected", () => {
    // const Component = () => {
    //     const
    // }
})
