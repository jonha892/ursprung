/**
 * Domain-Driven Design Project shared model.
 * This lives in packages/shared so both backend (persistence / API) and frontend (editors) use one source of truth.
 */

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
export type DddStepMeta = {
  label: string;
  goal: string; // Warum / Ziel des Schritts
  deliverable: string; // Beschreibung des erwarteten Artefakts
  example?: string; // Kleines Start-Beispiel / Template
};

export const DDD_STEP_META: Record<DddStepKind, DddStepMeta> = {
  [DddStepKind.VisionScope]: {
    label: "Vision & Scope",
    goal: "Warum existiert das Produkt, für wen ist es, und was ist explizit außerhalb des Scopes?",
    deliverable: "Zwei-Satz-Vision + 3-5 Out-of-Scope-Punkte (No-Gos).",
    example:
      "Vision: Für Freiberufler, die Rechnungen manuell pflegen, bietet BillSpark automatisierte Rechnungserstellung und Zahlungserinnerungen. Anders als Tabellen & PDF-Templates spart es Zeit und reduziert Fehler.\nOut-of-Scope: (1) Mehrsprachige PDFs, (2) Steuerberechnung, (3) Mobile App.",
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
export type AttachmentRef = {
  id: string; // UUID (generated client or server)
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  /** Backend can fill a signed/relative URL for download */
  url?: string;
  /** Optional short description / alt text */
  note?: string;
  createdAt: string; // ISO timestamp
};

/** Base shape all step content variants share */
type StepBase = {
  kind: DddStepKind;
  /** Free-form markdown / rich text content (core 80/20). */
  notes: string;
  /** Additional attachments (screenshots, photos) */
  attachments: AttachmentRef[];
  /** ISO timestamp of last edit on this step */
  updatedAt: string;
};

// Specialized optional structured fields per step (capturing the recommended deliverables)
export type VisionScopeContent = StepBase & {
  kind: DddStepKind.VisionScope;
  visionTwoSentence?: string; // 2-Satz-Vision
  outOfScope?: string[]; // 3-5 Punkte
};

export type MiniEventStormingContent = StepBase & {
  kind: DddStepKind.MiniEventStorming;
  domainEvents?: string[]; // past tense events 15-25
  commands?: string[]; // 5-10 commands
  externalSystems?: string[]; // 3-5 systems
  openQuestions?: string[];
};

export type UbiquitousLanguageContent = StepBase & {
  kind: DddStepKind.UbiquitousLanguage;
  glossary?: { term: string; definition: string }[]; // 10-20 Begriffe
};

export type SubdomainsBoundedContextsContent = StepBase & {
  kind: DddStepKind.SubdomainsBoundedContexts;
  subdomains?: {
    name: string;
    type: "core" | "supporting" | "generic";
    description?: string;
  }[];
  boundedContexts?: { name: string; purpose?: string; relations?: string[] }[];
};

export type ThinSliceContent = StepBase & {
  kind: DddStepKind.ThinSlice;
  sliceStatement?: string; // "User kann ..."
  acceptanceCriteria?: string[]; // 3-5
};

export type TacticalModelContent = StepBase & {
  kind: DddStepKind.TacticalModel;
  aggregates?: {
    name: string;
    purpose?: string;
    invariants?: string[]; // 3-7 Regeln
    commands?: { name: string; emits?: string[]; errors?: string[] }[];
    domainEvents?: string[];
  }[];
};

export type UseCasesPortsContractsContent = StepBase & {
  kind: DddStepKind.UseCasesPortsContracts;
  useCases?: {
    name: string;
    preconditions?: string[];
    postconditions?: string[];
    happyPath?: string[]; // ordered steps
    errorPaths?: string[];
  }[];
  apiContracts?: {
    name: string;
    method?: string;
    path?: string;
    description?: string;
  }[]; // coarse OpenAPI-like
};

export type ArchitectureCutContent = StepBase & {
  kind: DddStepKind.ArchitectureCut;
  folderSkeleton?: string; // e.g. code block text
  decisions?: string[]; // key choices
};

export type WalkingSkeletonContent = StepBase & {
  kind: DddStepKind.WalkingSkeleton;
  endpoints?: string[]; // implemented endpoints
  acceptanceTests?: string[]; // Gherkin-ish titles
  domainTests?: string[]; // invariants test names
  integrationNotes?: string[]; // events logged/outbox etc.
};

export type ReviewNextStepsContent = StepBase & {
  kind: DddStepKind.ReviewNextSteps;
  retrospectiveNotes?: { clear: string[]; uncertain: string[] };
  backlog?: {
    nextSliceIdeas?: string[];
    risks?: string[];
    openArchitectureDecisions?: string[];
  };
};

// Strongly typed mapping: verhindert falsches Zuordnen eines fremden Content-Objekts zu einem Step-Key
export type DddProjectContentMap = {
  [DddStepKind.VisionScope]: VisionScopeContent;
  [DddStepKind.MiniEventStorming]: MiniEventStormingContent;
  [DddStepKind.UbiquitousLanguage]: UbiquitousLanguageContent;
  [DddStepKind.SubdomainsBoundedContexts]: SubdomainsBoundedContextsContent;
  [DddStepKind.ThinSlice]: ThinSliceContent;
  [DddStepKind.TacticalModel]: TacticalModelContent;
  [DddStepKind.UseCasesPortsContracts]: UseCasesPortsContractsContent;
  [DddStepKind.ArchitectureCut]: ArchitectureCutContent;
  [DddStepKind.WalkingSkeleton]: WalkingSkeletonContent;
  [DddStepKind.ReviewNextSteps]: ReviewNextStepsContent;
};

export type DddProjectStepContent =
  DddProjectContentMap[keyof DddProjectContentMap];

export type DddProject = {
  id: string; // UUID
  name: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO (any change updates project)
  content: DddProjectContentMap; // strikt typisiert
};

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

/** Create a new empty project scaffold */
export function createEmptyProject(name: string, id: string): DddProject {
  const now = new Date().toISOString();
  const make = <K extends DddStepKind>(kind: K): DddProjectContentMap[K] => {
    const base: StepBase = {
      kind,
      notes: "",
      attachments: [],
      updatedAt: now,
    };
    // Für leeres Projekt reichen Basiseigenschaften; spezialisierte Felder optional
    return base as DddProjectContentMap[K];
  };
  const content: DddProjectContentMap = {
    [DddStepKind.VisionScope]: make(DddStepKind.VisionScope),
    [DddStepKind.MiniEventStorming]: make(DddStepKind.MiniEventStorming),
    [DddStepKind.UbiquitousLanguage]: make(DddStepKind.UbiquitousLanguage),
    [DddStepKind.SubdomainsBoundedContexts]: make(
      DddStepKind.SubdomainsBoundedContexts
    ),
    [DddStepKind.ThinSlice]: make(DddStepKind.ThinSlice),
    [DddStepKind.TacticalModel]: make(DddStepKind.TacticalModel),
    [DddStepKind.UseCasesPortsContracts]: make(
      DddStepKind.UseCasesPortsContracts
    ),
    [DddStepKind.ArchitectureCut]: make(DddStepKind.ArchitectureCut),
    [DddStepKind.WalkingSkeleton]: make(DddStepKind.WalkingSkeleton),
    [DddStepKind.ReviewNextSteps]: make(DddStepKind.ReviewNextSteps),
  };
  return { id, name, createdAt: now, updatedAt: now, content };
}

/** Update helper: replaces a step by kind immutably */
export function updateStep<K extends DddStepKind>(
  project: DddProject,
  kind: K,
  step: DddProjectContentMap[K]
): DddProject {
  // Sicherheitsnetz: Laufzeitcheck, falls kind !== step.kind (sollte statisch verhindert sein)
  if (step.kind !== kind) {
    throw new Error(`Step kind mismatch: key=${kind} payload=${step.kind}`);
  }
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    content: { ...project.content, [kind]: step } as DddProjectContentMap,
  };
}

/** Quick lookup */
export function findStep<K extends DddStepKind>(
  project: DddProject,
  kind: K
): DddProjectContentMap[K] {
  return project.content[kind];
}

// Suggested (SQLite) persistence sketch (not executable code):
// projects(id TEXT PK, name TEXT NOT NULL, created_at TEXT, updated_at TEXT)
// project_steps(project_id TEXT FK -> projects.id, kind TEXT, notes TEXT, attachments_json TEXT, content_json TEXT, updated_at TEXT,
//               PRIMARY KEY(project_id, kind))
// Attachments can either be stored inside attachments_json (array of objects) or normalized if needed:
// project_attachments(id TEXT PK, project_id TEXT, step_kind TEXT, file_name TEXT, mime_type TEXT, size_bytes INTEGER, note TEXT, created_at TEXT)
// File binary storage handled externally (filesystem/object storage) mapping by attachment id.
