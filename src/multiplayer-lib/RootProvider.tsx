import { ReactNode } from "react"
import { ManagerProvider } from "./ManagerProvider"
import { WebSocketProvider } from "./WebSocketProvider"
import { PeerConnectionProvider } from "./PeerConnectionProvider"

export const RootProvider = ({ children }: { children: ReactNode }) => (
    <ManagerProvider>
        <WebSocketProvider>
            <PeerConnectionProvider>{children}</PeerConnectionProvider>
        </WebSocketProvider>
    </ManagerProvider>
)
