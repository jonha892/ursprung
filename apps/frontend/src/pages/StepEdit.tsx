import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App as AntApp, Spin } from "antd";
import { useProjectStore } from "../stores/projectStore.ts";
import { DDD_STEPS, DddStepKind } from "../../../../packages/shared/ddd_project.ts";

// Import all step components
import { VisionScopeEdit } from "../components/VisionScopeEdit.tsx";
import { MiniEventStormingEdit } from "../components/MiniEventStormingEdit.tsx";
import { UbiquitousLanguageEdit } from "../components/UbiquitousLanguageEdit.tsx";
import { SubdomainsBoundedContextsEdit } from "../components/SubdomainsBoundedContextsEdit.tsx";
import { ThinSliceEdit } from "../components/ThinSliceEdit.tsx";
import { TacticalModelEdit } from "../components/TacticalModelEdit.tsx";
import { UseCasesPortsContractsEdit } from "../components/UseCasesPortsContractsEdit.tsx";
import { ArchitectureCutEdit } from "../components/ArchitectureCutEdit.tsx";
import { WalkingSkeletonEdit } from "../components/WalkingSkeletonEdit.tsx";
import { ReviewNextStepsEdit } from "../components/ReviewNextStepsEdit.tsx";

export default function StepEdit() {
    const { id, step } = useParams<{ id: string; step: string }>();
    const nav = useNavigate();
    const [initialLoading, setInitialLoading] = useState(false);

    // Select store methods and state
    const projects = useProjectStore((s) => s.projects);
    const currentProject = useProjectStore((s) => s.currentProject);
    const getProject = useProjectStore((s) => s.getProject);

    const project = currentProject?.id === id ? currentProject : projects.find((p) => p.id === id);
    const { message } = AntApp.useApp();
    const redirectedRef = useRef(false);

    // Validate step parameter
    const stepKind = step as DddStepKind;
    const isValidStep = DDD_STEPS.includes(stepKind);

    // Load project if not found in store (handles deep linking)
    useEffect(() => {
        if (!project && id && !redirectedRef.current && !initialLoading && isValidStep) {
            setInitialLoading(true);
            getProject(id)
                .then(() => {
                    setInitialLoading(false);
                })
                .catch(() => {
                    setInitialLoading(false);
                    if (!redirectedRef.current) {
                        redirectedRef.current = true;
                        message.error("Projekt nicht gefunden");
                        nav("/", { replace: true });
                    }
                });
        }
    }, [project, id, getProject, message, nav, initialLoading, isValidStep]);

    // Redirect if step not valid
    useEffect(() => {
        if (!isValidStep && !redirectedRef.current) {
            redirectedRef.current = true;
            message.error("Schritt nicht gefunden");
            nav("/", { replace: true });
        }
    }, [isValidStep, nav, message]);

    // Show loading spinner during initial load
    if (initialLoading || (!project && !redirectedRef.current && isValidStep)) {
        return (
            <div
                style={{
                    padding: "96px 32px",
                    maxWidth: 1280,
                    margin: "0 auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "50vh",
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (!project || !isValidStep) return null;

    // Route to the appropriate step component
    switch (stepKind) {
        case DddStepKind.VisionScope:
            return <VisionScopeEdit project={project} />;
        case DddStepKind.MiniEventStorming:
            return <MiniEventStormingEdit project={project} />;
        case DddStepKind.UbiquitousLanguage:
            return <UbiquitousLanguageEdit project={project} />;
        case DddStepKind.SubdomainsBoundedContexts:
            return <SubdomainsBoundedContextsEdit project={project} />;
        case DddStepKind.ThinSlice:
            return <ThinSliceEdit project={project} />;
        case DddStepKind.TacticalModel:
            return <TacticalModelEdit project={project} />;
        case DddStepKind.UseCasesPortsContracts:
            return <UseCasesPortsContractsEdit project={project} />;
        case DddStepKind.ArchitectureCut:
            return <ArchitectureCutEdit project={project} />;
        case DddStepKind.WalkingSkeleton:
            return <WalkingSkeletonEdit project={project} />;
        case DddStepKind.ReviewNextSteps:
            return <ReviewNextStepsEdit project={project} />;
        default:
            return null;
    }
}
