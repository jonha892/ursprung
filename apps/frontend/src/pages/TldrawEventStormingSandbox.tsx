import { TldrawEventStorming } from "../components/TldrawEventStorming.tsx";

export default function TldrawEventStormingSandbox() {
    return (
        <div
            style={{
                padding: "96px 32px 32px",
                maxWidth: 1400,
                margin: "0 auto",
                height: "calc(100vh - 160px)",
            }}
        >
            <TldrawEventStorming />
        </div>
    );
}
