import { EventStorming } from "../components/EventStorming.tsx";

export default function EventStormingSandbox() {
    return (
        <div
            style={{
                padding: "96px 32px 32px",
                maxWidth: 1400,
                margin: "0 auto",
                height: "calc(100vh - 160px)",
            }}
        >
            <EventStorming showExportPreview />
        </div>
    );
}
