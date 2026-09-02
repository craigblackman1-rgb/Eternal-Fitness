import { TemplatePasteClient } from "./TemplatePasteClient";

export default function NewWorkoutTemplatePage({
  searchParams,
}: {
  searchParams?: { blank?: string };
}) {
  return <TemplatePasteClient startBlank={searchParams?.blank === "1"} />;
}
