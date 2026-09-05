"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus, IconTrash2 } from "@/components/icons";
import type { TrainingRule, TrainingRuleType } from "@/types";

interface TrainingRulesEditorProps {
  value: TrainingRule[];
  onChange: (value: TrainingRule[]) => void;
}

function newRule(defaultRuleTypeId: string): TrainingRule {
  return {
    id: crypto.randomUUID(),
    rule_type_id: defaultRuleTypeId,
    detail: "",
    severity: "hard",
  };
}

export function TrainingRulesEditor({ value, onChange }: TrainingRulesEditorProps) {
  const [ruleTypes, setRuleTypes] = useState<TrainingRuleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rule-types")
      .then((res) => res.json())
      .then((data: TrainingRuleType[]) => {
        if (!cancelled) setRuleTypes(data.filter((rt) => rt.active));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (id: string, updates: Partial<TrainingRule>) => {
    onChange(value.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
  };

  const remove = (id: string) => onChange(value.filter((rule) => rule.id !== id));

  const add = () => {
    if (ruleTypes.length === 0) return;
    onChange([...value, newRule(ruleTypes[0].id)]);
  };

  const labelFor = (ruleTypeId: string) =>
    ruleTypes.find((rt) => rt.id === ruleTypeId)?.label ?? "Unknown rule type — was deactivated";

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No structured training rules set yet. Set here what the Plan Agent must exclude, restrict,
          emphasise, or follow for this client — it applies these systematically instead of parsing prose.
        </p>
      )}
      {value.map((rule) => (
        <div key={rule.id} className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--hub-border)] p-3 md:grid-cols-[1fr_2fr_auto_auto]">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Rule type</label>
            <Select value={rule.rule_type_id} onValueChange={(v) => update(rule.id, { rule_type_id: v })} disabled={loading}>
               <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue>{labelFor(rule.rule_type_id)}</SelectValue></SelectTrigger>
              <SelectContent>
                {ruleTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Detail</label>
            <Input
              value={rule.detail}
              onChange={(e) => update(rule.id, { detail: e.target.value })}
              placeholder="e.g. Foam roller — refuses, do not programme"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Severity</label>
            <Select value={rule.severity} onValueChange={(v: TrainingRule["severity"]) => update(rule.id, { severity: v })}>
               <SelectTrigger className="md:w-32 border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hard">Hard constraint</SelectItem>
                <SelectItem value="soft">Soft preference</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(rule.id)} className="text-muted-foreground hover:text-destructive">
              <IconTrash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} disabled={loading || ruleTypes.length === 0} className="gap-1.5 rounded-pill border-border/60">
        <IconPlus className="h-4 w-4" />
        Add training rule
      </Button>
    </div>
  );
}
