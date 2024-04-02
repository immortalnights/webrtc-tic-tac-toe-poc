import {
    RenderOptions,
    act,
    render as reactRender,
    renderHook,
    screen,
} from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { WebSocketContextProvider } from "."
import { ReactElement, useEffect } from "react"
import { useWebSocket } from "./useWebSocket"

const render = (ui: ReactElement, options: RenderOptions = {}) => {
    return reactRender(ui, { wrapper: WebSocketContextProvider, ...options })
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
