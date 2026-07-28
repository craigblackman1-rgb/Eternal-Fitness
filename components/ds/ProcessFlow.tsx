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
  return (
    <Reveal
      className="ds-flow"
      stagger={0.12}
      y={40}
      start="top 82%"
      style={{ ["--ds-flow-count" as string]: steps.length }}
    >
      {steps.map((step, i) => (
        <div key={step.title} className="ds-flow-step">
          {step.image && (
            <div className="ds-flow-step-img">
              <Image
                src={step.image}
                alt={step.imageAlt ?? step.title}
                fill
                sizes="(max-width: 1000px) 100vw, 25vw"
                style={{ objectFit: "cover", ...(step.imagePosition ? { objectPosition: step.imagePosition } : {}) }}
              />
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
