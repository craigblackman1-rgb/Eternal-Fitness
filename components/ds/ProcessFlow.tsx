import Image from "next/image";
import { Reveal } from "./Reveal";

export interface FlowStep {
  title: string;
  body: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
}

/** Numbered horizontal process flow with a connecting line — a diagram, not a card grid. */
export function ProcessFlow({ steps }: { steps: FlowStep[] }) {
  const hasAnyImage = steps.some((s) => s.image);
  return (
    <Reveal
      className={hasAnyImage ? "ds-flow ds-flow-has-img" : "ds-flow"}
      stagger={0.12}
      y={40}
      start="top 82%"
      style={{ ["--ds-flow-count" as string]: steps.length }}
    >
      {steps.map((step, i) => (
        <div key={step.title} className="ds-flow-step">
          {hasAnyImage && (
            <div className="ds-flow-step-img" style={step.image ? undefined : { visibility: "hidden" }}>
              {step.image && (
                <Image
                  src={step.image}
                  alt={step.imageAlt ?? step.title}
                  fill
                  sizes="(max-width: 1000px) 100vw, 25vw"
                  style={{ objectFit: "cover", ...(step.imagePosition ? { objectPosition: step.imagePosition } : {}) }}
                />
              )}
            </div>
          )}
          <div className="ds-flow-num">{i + 1}</div>
          <h4>{step.title}</h4>
          <p>{step.body}</p>
        </div>
      ))}
    </Reveal>
  );
}

export default ProcessFlow;
