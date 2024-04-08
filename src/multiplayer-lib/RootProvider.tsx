import { ReactNode } from "react"
import { ManagerProvider } from "./ManagerProvider"
import { WebSocketProvider } from "./WebSocketProvider"
import { PeerConnectionProvider } from "./PeerConnection"

export const RootProvider = ({ children }: { children: ReactNode }) => (
    <ManagerProvider>
        <WebSocketProvider>
            <PeerConnectionProvider>{children}</PeerConnectionProvider>
        </WebSocketProvider>
    </ManagerProvider>
)
