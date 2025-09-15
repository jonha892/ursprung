/**
 * Domain-Driven Design Project shared model.
 * This lives in packages/shared so both backend (persistence / API) and frontend (editors) use one source of truth.
 */
import { z } from "zod";

// Fixed canonical step identifiers (stable keys for DB + API)
export enum DddStepKind {
  VisionScope = "vision_scope",
  MiniEventStorming = "mini_event_storming",
  UbiquitousLanguage = "ubiquitous_language",
  SubdomainsBoundedContexts = "subdomains_bounded_contexts",
  ThinSlice = "thin_slice",
  TacticalModel = "tactical_model",
  UseCasesPortsContracts = "use_cases_ports_contracts",
  ArchitectureCut = "architecture_cut",
  WalkingSkeleton = "walking_skeleton",
  ReviewNextSteps = "review_next_steps",
}

// Rich metadata for each step: label (short), goal (Ziel), deliverable description and optional starter example.
const DddStepMetaSchema = z.object({
  label: z.string(),
  goal: z.string(),
  deliverable: z.string(),
  example: z.string().optional(),
});
export type DddStepMeta = z.infer<typeof DddStepMetaSchema>;

export const DDD_STEP_META: Record<DddStepKind, DddStepMeta> = {
  [DddStepKind.VisionScope]: {
    label: "Vision & Scope",
    goal: "Warum existiert das Produkt, für wen ist es, und was ist explizit außerhalb des Scopes?",
    deliverable: "Zwei Texte: Vision und Scope.",
    example:
      "Vision: Für Freiberufler, die Rechnungen manuell pflegen, bietet BillSpark automatisierte Rechnungserstellung und Zahlungserinnerungen. Anders als Tabellen & PDF-Templates spart es Zeit und reduziert Fehler.\nScope: Out-of-Scope: (1) Mehrsprachige PDFs, (2) Steuerberechnung, (3) Mobile App.",
  },
  [DddStepKind.MiniEventStorming]: {
    label: "Mini-Event-Storming",
    goal: "Kern-Ende-zu-Ende Fluss(e) & Wissenslücken sichtbar machen.",
    deliverable:
      "15-25 Domain Events (Vergangenheit), 5-10 Commands, 3-5 externe Systeme, offene Fragen.",
    example:
      "Events: InvoiceDraftCreated, LineItemAdded, InvoiceSubmitted, InvoiceSentToClient, PaymentReceived\nCommands: CreateInvoiceDraft, AddLineItem, SubmitInvoice...\nExternal: EmailService, PaymentProvider",
  },
  [DddStepKind.UbiquitousLanguage]: {
    label: "Ubiquitous Language",
    goal: "Geteiltes, eindeutiges Vokabular für Team & Code etablieren.",
    deliverable:
      "Glossar mit 10-20 Begriffen + kurze Definitionen, konsistent genutzt.",
    example:
      "Term: Invoice Draft - Eine bearbeitbare Rechnung vor dem Einfrieren / Senden.",
  },
  [DddStepKind.SubdomainsBoundedContexts]: {
    label: "Subdomänen & Bounded Contexts",
    goal: "Strategische Aufteilung: Core vs. Supporting vs. Generic & klare Kontexte.",
    deliverable:
      "Subdomänen-Skizze + Mini-Context-Map (Kästen, Pfeile, Beziehungstypen).",
    example:
      "Subdomains: Billing (Core), Notifications (Supporting), Auth (Generic)\nContexts: BillingContext, NotificationContext, IdentityContext",
  },
  [DddStepKind.ThinSlice]: {
    label: "Thin Slice wählen",
    goal: "Kleinstes Ende-zu-Ende-Inkrement mit erkennbarem Wert und wenig Abhängigkeiten.",
    deliverable: "Slice-Statement + 3-5 Akzeptanzkriterien.",
    example:
      "Statement: User kann einen Rechnungsentwurf anlegen und als PDF exportieren.\nAK: (1) Entwurf mit Titel & Positionen, (2) Summe automatisch, (3) PDF Download möglich.",
  },
  [DddStepKind.TacticalModel]: {
    label: "Taktisches Modell",
    goal: "Zentrale Aggregate, Invarianten & Domain Events des Fokus-Kontexts klären.",
    deliverable:
      "Aggregate-Canvas je Aggregat (Name, Zweck, Invarianten, Commands→Events, Fehlerfälle).",
    example:
      "Aggregate: Invoice\nInvarianten: Total = Sum(lineItems.amount); Status nur Draft|Submitted|Sent|Paid\nCommand: SubmitInvoice → Event: InvoiceSubmitted",
  },
  [DddStepKind.UseCasesPortsContracts]: {
    label: "Use-Cases / Ports & Kontrakte",
    goal: "Verhalten ohne UI definieren, externe Schnittstellen minimal klären.",
    deliverable:
      "3-5 Use-Cases (Vor-/Nachbedingungen, Fehlerpfade) + minimale API/Port Kontrakte.",
    example:
      "UseCase: AddLineItem (Pre: Draft existiert; Post: neues Item erscheint; Fehler: DraftLocked)\nAPI: POST /invoices/{id}/items",
  },
  [DddStepKind.ArchitectureCut]: {
    label: "Architektur-Schnitt",
    goal: "Minimales Laufsteg-Skelett ohne Over-Engineering festlegen.",
    deliverable:
      "Ordner-Skeleton nach Kontext(en) & Layern (+ evtl. 1 ADR-Notiz).",
    example: "/src\n  /Billing\n    /domain\n    /application\n    /adapters",
  },
  [DddStepKind.WalkingSkeleton]: {
    label: "Walking Skeleton",
    goal: "Ende-zu-Ende minimal funktionsfähige vertikale Scheibe bereitstellen.",
    deliverable:
      "1 Endpoint → Service → Domain → Repository Stub/DB + Tests + Event-Logging.",
    example:
      "Implemented: POST /invoices (creates draft)\nTests: Accept: create+fetch; Domain: invariant total recalculation.",
  },
  [DddStepKind.ReviewNextSteps]: {
    label: "Review & Next Steps",
    goal: "Lernen festhalten & nächste Schritte planen.",
    deliverable:
      "Retro (klar vs. wacklig) + Backlog: nächster Slice, Risiken, offene Architekturentscheidungen.",
    example:
      "Clear: Aggregat 'Invoice' stabil. Uncertain: Zahlungsfluss. Next: Payment Slice evaluieren.",
  },
};

// Convenience legacy mapping (label only) if older code expects it
export const DDD_STEP_LABEL: Record<DddStepKind, string> = Object.fromEntries(
  Object.entries(DDD_STEP_META).map(([k, v]) => [k, v.label])
) as Record<DddStepKind, string>;

/** Generic file attachment (e.g. screenshot, board photo) */
export type AttachmentRef = z.infer<typeof AttachmentRefSchema>;

/** Base shape all step content variants share */
// (StepBase now modeled via StepBaseSchema and specialized schemas below)

// Specialized optional structured fields per step (capturing the recommended deliverables)
export type VisionScopeContent = z.infer<typeof VisionScopeContentSchema>;
export type MiniEventStormingContent = z.infer<
  typeof MiniEventStormingContentSchema
>;
export type UbiquitousLanguageContent = z.infer<
  typeof UbiquitousLanguageContentSchema
>;
export type SubdomainsBoundedContextsContent = z.infer<
  typeof SubdomainsBoundedContextsContentSchema
>;
export type ThinSliceContent = z.infer<typeof ThinSliceContentSchema>;
export type TacticalModelContent = z.infer<typeof TacticalModelContentSchema>;
export type UseCasesPortsContractsContent = z.infer<
  typeof UseCasesPortsContractsContentSchema
>;
export type ArchitectureCutContent = z.infer<
  typeof ArchitectureCutContentSchema
>;
export type WalkingSkeletonContent = z.infer<
  typeof WalkingSkeletonContentSchema
>;
export type ReviewNextStepsContent = z.infer<
  typeof ReviewNextStepsContentSchema
>;

// Strongly typed mapping: verhindert falsches Zuordnen eines fremden Content-Objekts zu einem Step-Key
export type DddProjectContentMap = z.infer<typeof DddProjectContentMapSchema>;

export type DddProjectStepContent =
  DddProjectContentMap[keyof DddProjectContentMap];

export type DddProject = z.infer<typeof DddProjectSchema>;

// Canonical ordered list of steps (use as template and for ordering in UI)
export const DDD_STEPS: DddStepKind[] = [
  DddStepKind.VisionScope,
  DddStepKind.MiniEventStorming,
  DddStepKind.UbiquitousLanguage,
  DddStepKind.SubdomainsBoundedContexts,
  DddStepKind.ThinSlice,
  DddStepKind.TacticalModel,
  DddStepKind.UseCasesPortsContracts,
  DddStepKind.ArchitectureCut,
  DddStepKind.WalkingSkeleton,
  DddStepKind.ReviewNextSteps,
];

export const createNewProject = (
  name: string,
  id: string,
  abstract: string
): DddProject => {
  const now = new Date().toISOString();

  return {
    id,
    name,
    createdAt: now,
    abstract,
    updatedAt: now,
    content: DDD_STEPS.map((kind) => {
      if (kind === DddStepKind.VisionScope) {
        return {
          kind,
          vision: "",
          scope: "",
          completed: false,
          updatedAt: now,
        };
      }
      return {
        kind,
        completed: false,
        updatedAt: now,
      };
    }).reduce(
      (obj, step) => ({ ...obj, [step.kind]: step }),
      {}
    ) as unknown as DddProjectContentMap,
  };
};

// ---------------- Zod Schema (runtime validation) ----------------

// Reusable ISO timestamp string (UTC or with offset); Zod v4 .datetime() handles validation.
// const isoDateTime = z.datetime();

export const AttachmentRefSchema = z.object({
  id: z.string().min(3),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
  createdAt: z.string().datetime(),
});

// Base step schema (without kind literal) used for each specialized step.
const StepBaseSchema = z.object({
  updatedAt: z.string().datetime(),
  completed: z.boolean(),
});

// Helper to build a step schema with a fixed kind literal.
const step = <K extends DddStepKind>(kind: K) =>
  StepBaseSchema.extend({ kind: z.literal(kind) });

export const VisionScopeContentSchema = StepBaseSchema.extend({
  kind: z.literal(DddStepKind.VisionScope),
  vision: z.string(),
  scope: z.string(),
});
export const MiniEventStormingContentSchema = step(
  DddStepKind.MiniEventStorming
);
export const UbiquitousLanguageContentSchema = step(
  DddStepKind.UbiquitousLanguage
);
export const SubdomainsBoundedContextsContentSchema = step(
  DddStepKind.SubdomainsBoundedContexts
);
export const ThinSliceContentSchema = step(DddStepKind.ThinSlice);
export const TacticalModelContentSchema = step(DddStepKind.TacticalModel);
export const UseCasesPortsContractsContentSchema = step(
  DddStepKind.UseCasesPortsContracts
);
export const ArchitectureCutContentSchema = step(DddStepKind.ArchitectureCut);
export const WalkingSkeletonContentSchema = step(DddStepKind.WalkingSkeleton);
export const ReviewNextStepsContentSchema = step(DddStepKind.ReviewNextSteps);

export const DddProjectContentMapSchema = z.object({
  [DddStepKind.VisionScope]: VisionScopeContentSchema,
  [DddStepKind.MiniEventStorming]: MiniEventStormingContentSchema,
  [DddStepKind.UbiquitousLanguage]: UbiquitousLanguageContentSchema,
  [DddStepKind.SubdomainsBoundedContexts]:
    SubdomainsBoundedContextsContentSchema,
  [DddStepKind.ThinSlice]: ThinSliceContentSchema,
  [DddStepKind.TacticalModel]: TacticalModelContentSchema,
  [DddStepKind.UseCasesPortsContracts]: UseCasesPortsContractsContentSchema,
  [DddStepKind.ArchitectureCut]: ArchitectureCutContentSchema,
  [DddStepKind.WalkingSkeleton]: WalkingSkeletonContentSchema,
  [DddStepKind.ReviewNextSteps]: ReviewNextStepsContentSchema,
});

export const DddProjectSchema = z.object({
  // Project IDs are human-friendly slug-hash (not strict UUID)
  id: z.string().min(3),
  name: z.string().min(1),
  abstract: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  content: DddProjectContentMapSchema,
});

export type DddProjectValidated = z.infer<typeof DddProjectSchema>; // alias

export function parseDddProject(input: unknown): DddProject {
  return DddProjectSchema.parse(input);
}

export function isDddProject(input: unknown): input is DddProject {
  return DddProjectSchema.safeParse(input).success;
}

export const DddProjectArraySchema = z.array(DddProjectSchema);
