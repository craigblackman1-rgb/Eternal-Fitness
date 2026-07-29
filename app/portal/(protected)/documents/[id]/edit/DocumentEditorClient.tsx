"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocument } from "@/lib/documents/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconCheckCircle, IconAlertCircle, IconChevronLeft, IconChevronRight, IconSave } from "@/components/icons";

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function DocumentEditorClient({ doc }: { doc: ClientDocument }) {
  const router = useRouter();
  const sections = doc.body.feedbackSections ?? [];
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>(
    (doc.feedback_responses?.answers as Record<string, string>) ?? {},
  );
  const [consents, setConsents] = useState<Record<string, boolean>>(
    (doc.feedback_responses?.consents as Record<string, boolean>) ?? {},
  );
  const [saved, setSaved] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const doneCount = sections.filter((_, i) => {
    const sectionQuestions = sections[i]?.questions ?? [];
    return sectionQuestions.every((q) => {
      if (q.type === "choice") return !!answers[q.id];
      return true; // text fields are optional
    });
  }).length;

  const progressPercent = Math.round((doneCount / Math.max(sections.length, 1)) * 100);

  const currentSectionData = sections[currentSection - 1];

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    setSaved(false);
  };

  const save = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "client",
          name: doc.client_name || "",
          signature: doc.client_name || "",
          date: new Date().toISOString().slice(0, 10),
          feedback_responses: { answers, consents },
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSaved(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [doc.id, doc.client_name, answers, consents]);

  // Autosave on any change after a delay
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => save(), 2000);
    return () => clearTimeout(t);
  }, [answers, consents, saved, save]);

  const validateCurrentSection = (): boolean => {
    if (!currentSectionData) return true;
    const newErrors: Record<string, string> = {};
    currentSectionData.questions.forEach((q) => {
      if (q.type === "choice" && !answers[q.id]) {
        newErrors[q.id] = "Please select an option";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validateCurrentSection()) return;
    if (currentSection < sections.length) {
      setCurrentSection((p) => p + 1);
    } else {
      // All done — submit final
      setSubmitted(true);
      save();
    }
  };

  const goBack = () => {
    setErrors({});
    if (currentSection > 1) setCurrentSection((p) => p - 1);
  };

  if (submitted) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-6">
          <div className="flex gap-3">
            <div className="w-[38px] h-[38px] rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0">
              <IconCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">That is the questionnaire finished</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Thank you. Esther has been notified and will read it before your next session.
                {submitError && (
                  <span className="block text-amber font-medium mt-1">Your answers are saved but there was a minor issue syncing. Esther can still see them.</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Your answers are saved in your documents. You can change any of them at any time — in fact, please do, whenever something changes.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => router.replace("/portal/documents")} className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90">
            Back to your documents
          </button>
          <button type="button" onClick={() => { setSubmitted(false); setCurrentSection(1); }} className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent">
            Review my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Autosave status */}
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        {saved ? (
          <>
            <IconCheckCircle className="w-3.5 h-3.5 text-teal" />
            Saved automatically
          </>
        ) : (
          <>
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40 border-t-teal animate-spin" />
            Saving…
          </>
        )}
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-foreground">{doneCount} of {sections.length} sections complete</span>
          <span className="text-xs text-muted-foreground">Section {currentSection} of {sections.length}</span>
        </div>
        <div className="h-2 rounded-full bg-off-white border border-border/60 overflow-hidden">
          <div className="h-full rounded-full bg-teal transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Section navigation + form */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Section side nav */}
        <nav className="w-full lg:w-56 shrink-0 rounded-2xl border border-border/60 bg-white p-4" aria-label="Questionnaire sections">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground mb-3">Sections</p>
          <ol className="space-y-1">
            {sections.map((section, i) => {
              const secNum = i + 1;
              const isCurrent = secNum === currentSection;
              const isDone = doneCount > i || (secNum < currentSection);
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => { setErrors({}); setCurrentSection(secNum); }}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-3 w-full min-h-[3rem] px-3 py-2 rounded-lg text-left font-medium text-sm transition-colors",
                      isCurrent ? "border-2 border-foreground bg-off-white" : "border border-transparent hover:bg-off-white",
                    )}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
                      isDone ? "bg-teal text-white" : isCurrent ? "bg-amber/20 text-amber" : "bg-off-white border border-border/60 text-muted-foreground",
                    )}>
                      {isDone ? (
                        <IconCheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        secNum
                      )}
                    </span>
                    {section.title}
                    {isDone && <span className="sr-only">— complete</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Section form */}
        <div className="flex-1 min-w-0">
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-5" role="alert">
              <div className="flex gap-2.5">
                <IconAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Error saving</p>
                  <p className="text-sm text-red-700 mt-0.5">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 mb-5" role="alert">
              <h3 className="text-sm font-semibold text-red-800 mb-2">There is something still to answer</h3>
              <ul className="space-y-1">
                {Object.entries(errors).map(([id, msg]) => (
                  <li key={id} className="text-sm text-red-700">
                    <a href={`#q-${id}`} className="underline font-medium hover:text-red-900">{msg}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentSectionData && (
            <HubCard>
              <HubCardHeader
                title={currentSectionData.title}
                subtitle={`Section ${currentSection} of ${sections.length}`}
                color="teal"
              />
              {currentSectionData.intro && (
                <p className="text-sm text-muted-foreground mb-5">{currentSectionData.intro}</p>
              )}

              <div className="space-y-6">
                {currentSectionData.questions.map((q) => (
                  <div key={q.id} id={`q-${q.id}`}>
                    {q.type === "choice" && q.options ? (
                      <fieldset className="border-0 p-0 m-0">
                        <legend className="text-sm font-semibold text-foreground mb-1">{q.label}</legend>
                        {q.note && <p className="text-xs text-muted-foreground mb-3 italic">{q.note}</p>}
                        <div className="space-y-2">
                          {q.options.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-3 py-2.5 px-4 rounded-lg border border-border/60 cursor-pointer hover:bg-off-white">
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.value}
                                checked={answers[q.id] === opt.value}
                                onChange={(e) => setAnswer(q.id, e.target.value)}
                                className="h-4 w-4 text-teal shrink-0"
                              />
                              <span className="text-sm text-foreground">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {errors[q.id] && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                            <IconAlertCircle className="w-3.5 h-3.5" />
                            {errors[q.id]}
                          </p>
                        )}
                      </fieldset>
                    ) : (
                      <div>
                        <label htmlFor={`input-${q.id}`} className="block text-sm font-semibold text-foreground mb-1">{q.label}</label>
                        {q.note && <p className="text-xs text-muted-foreground mb-2 italic">{q.note}</p>}
                        <textarea
                          id={`input-${q.id}`}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          placeholder="You can leave this blank"
                          rows={3}
                          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </HubCard>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 z-20 rounded-2xl border border-border/60 bg-white/90 backdrop-blur p-4 flex items-center gap-3">
        <span className="text-xs text-muted-foreground flex items-center gap-2">
          {saved ? (
            <>
              <IconSave className="w-3.5 h-3.5 text-teal" />
              Saved automatically
            </>
          ) : (
            <>
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40 border-t-teal animate-spin" />
              Saving…
            </>
          )}
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={goBack}
            disabled={currentSection <= 1}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-input px-4 text-sm font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <IconChevronLeft className="w-3.5 h-3.5" />
            Back a section
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90 disabled:opacity-50"
          >
            {currentSection < sections.length ? (
              <>Save and continue <IconChevronRight className="w-3.5 h-3.5" /></>
            ) : (
              <>Finish questionnaire</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
