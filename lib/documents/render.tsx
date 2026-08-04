import type { DocumentBody, ConsentGroup, FeedbackSection, FeedbackConsent } from "./types";

/**
 * Renders a document body (intro + sections) as branded, read-only HTML.
 * Section HTML is authored by Esther in the template editor, so it is rendered
 * with dangerouslySetInnerHTML — same trust model as the PAR-Q/agreement copy.
 *
 * If `consentGroups` are present and `onConsentChange` is supplied, the groups
 * render as REAL interactive checkboxes (React state) rather than static HTML.
 *
 * If `feedbackSections`/`feedbackConsents` are present (the "feedback" kind),
 * they render as real interactive text inputs / radio groups / checkboxes,
 * gated behind their own answer-state props the same way consentGroups is.
 */
export function DocumentBodyView({
  body,
  consentChoices,
  onConsentChange,
  feedbackAnswers,
  onFeedbackAnswerChange,
  feedbackConsentChoices,
  onFeedbackConsentChange,
  startIndex = 1,
}: {
  body: DocumentBody;
  consentChoices?: Record<string, boolean>;
  onConsentChange?: (key: string, value: boolean) => void;
  feedbackAnswers?: Record<string, string>;
  onFeedbackAnswerChange?: (id: string, value: string) => void;
  feedbackConsentChoices?: Record<string, boolean>;
  onFeedbackConsentChange?: (id: string, value: boolean) => void;
  /** Number the first section starts at (used so refreshed docs continue the count). */
  startIndex?: number;
}) {
  return (
    <div className="doc-prose">
      {body.intro && (
        <div
          className="doc-standfirst"
          dangerouslySetInnerHTML={{ __html: body.intro }}
        />
      )}
      {body.sections.map((s, i) => (
        <section key={s.id} className="doc-section" aria-labelledby={`sec-${s.id}`}>
          <p className="doc-section__num">
            {String(startIndex + i).padStart(2, "0")}
          </p>
          <h2 id={`sec-${s.id}`} className="doc-section__title">
            {s.title}
          </h2>
          <div
            className="doc-section__intro"
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        </section>
      ))}

      {body.consentGroups && onConsentChange && (
        <ConsentGroupsView groups={body.consentGroups} choices={consentChoices ?? {}} onChange={onConsentChange} />
      )}

      {body.feedbackSections && onFeedbackAnswerChange && (
        <FeedbackSectionsView
          sections={body.feedbackSections}
          answers={feedbackAnswers ?? {}}
          onAnswerChange={onFeedbackAnswerChange}
        />
      )}

      {body.feedbackConsents && onFeedbackConsentChange && (
        <FeedbackConsentsView
          consents={body.feedbackConsents}
          choices={feedbackConsentChoices ?? {}}
          onChange={onFeedbackConsentChange}
        />
      )}
    </div>
  );
}

function FeedbackSectionsView({
  sections,
  answers,
  onAnswerChange,
}: {
  sections: FeedbackSection[];
  answers: Record<string, string>;
  onAnswerChange: (id: string, value: string) => void;
}) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} className="doc-section" aria-labelledby={`fb-${s.id}`}>
          <p className="doc-section__num">{s.num}</p>
          <h2 id={`fb-${s.id}`} className="doc-section__title">
            {s.title}
          </h2>
          {s.intro && <p className="doc-section__intro">{s.intro}</p>}

          <div className="field-grid">
            {s.questions.map((q) =>
              q.type === "text" ? (
                <div key={q.id} className="field field--full">
                  <label className="field__label" htmlFor={`fb-q-${q.id}`}>
                    {q.label}
                  </label>
                  <textarea
                    id={`fb-q-${q.id}`}
                    className="textarea"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  />
                </div>
              ) : q.type === "multi" ? (
                <div key={q.id} className="q field--full" role="group" aria-labelledby={`fb-q-${q.id}-t`}>
                  <p className="q__legend" id={`fb-q-${q.id}-t`}>
                    {q.label}
                  </p>
                  {q.note && <p className="q__note">{q.note}</p>}
                  <div className="optset">
                    {q.options?.map((opt) => {
                      const selected = (answers[q.id] ?? "").split(", ").filter(Boolean);
                      const checked = selected.includes(opt.value);
                      return (
                        <label key={opt.value} className="opt">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selected, opt.value]
                                : selected.filter((v) => v !== opt.value);
                              onAnswerChange(q.id, next.join(", "));
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div key={q.id} className="q field--full" role="radiogroup" aria-labelledby={`fb-q-${q.id}-t`}>
                  <p className="q__legend" id={`fb-q-${q.id}-t`}>
                    {q.label}
                  </p>
                  {q.note && <p className="q__note">{q.note}</p>}
                  <div className="q__answer">
                    {q.options?.map((opt) => (
                      <label key={opt.value} className="pick">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt.value}
                          checked={answers[q.id] === opt.value}
                          onChange={() => onAnswerChange(q.id, opt.value)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      ))}
    </>
  );
}

function FeedbackConsentsView({
  consents,
  choices,
  onChange,
}: {
  consents: FeedbackConsent[];
  choices: Record<string, boolean>;
  onChange: (id: string, value: boolean) => void;
}) {
  return (
    <div className="doc-consent-groups">
      {consents.map((c) => (
        <label key={c.id} className="consent">
          <input
            type="checkbox"
            checked={!!choices[c.id]}
            onChange={(e) => onChange(c.id, e.target.checked)}
          />
          <span>{c.label}</span>
        </label>
      ))}
    </div>
  );
}

function ConsentGroupsView({
  groups,
  choices,
  onChange,
}: {
  groups: ConsentGroup[];
  choices: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <div className="doc-consent-groups">
      {groups.map((group) => (
        <fieldset key={group.id} className="doc-consent-fieldset">
          <legend className="check-group-legend">{group.legend}</legend>
          <div className="doc-consent-options">
            {group.options.map((opt) => (
              <label key={opt.key} className="consent">
                <input
                  type="checkbox"
                  checked={!!choices[opt.key]}
                  onChange={(e) => onChange(opt.key, e.target.checked)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
