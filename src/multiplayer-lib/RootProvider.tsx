import { ReactNode } from "react"
import { ManagerProvider } from "./ManagerProvider"
import { WebSocketProvider } from "./WebSocket/Provider"
import { PeerConnectionProvider } from "./PeerConnection"

export const RootProvider = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>
        <ManagerProvider>
            <PeerConnectionProvider>{children}</PeerConnectionProvider>
        </ManagerProvider>
    </WebSocketProvider>
)
