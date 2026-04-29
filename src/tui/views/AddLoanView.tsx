import { ConfirmInput, StatusMessage, TextInput } from "@inkjs/ui";
import { Box, Text, useFocus, useFocusManager } from "ink";
import { useState } from "react";

import { money } from "../../core/format.ts";
import { saveDb } from "../../core/storage.ts";
import type { Database, Debt } from "../../core/types.ts";
import { palette } from "../theme.ts";

type Props = {
  db: Database;
  onSaved: (next: Database) => void;
  onCancel: () => void;
};

const generateId = (): string =>
  `debt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const isYm = (s: string): boolean => /^\d{4}-\d{2}$/.test(s);

export const AddLoanView = ({ db, onSaved, onCancel }: Props) => {
  const { focusNext } = useFocusManager();

  const [name, setName] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [totalInstalments, setTotalInstalments] = useState("");
  const [paidInstalments, setPaidInstalments] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const origAmt = parseInt(originalAmount, 10) || 0;
  const total = parseInt(totalInstalments, 10) || 0;
  const paid = parseInt(paidInstalments, 10) || 0;
  const remaining = total > 0 ? Math.max(0, total - paid) : 0;
  const principalRemaining =
    origAmt > 0 && total > 0
      ? Math.round((origAmt / total) * remaining)
      : 0;

  const setError = (field: string, msg: string) =>
    setErrors((e) => ({ ...e, [field]: msg }));
  const clearError = (field: string) =>
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });

  const handleSave = async (confirmed: boolean) => {
    if (!confirmed) { onCancel(); return; }

    const payment = parseInt(monthlyPayment, 10);
    const rate = annualRate === "" ? 0 : parseFloat(annualRate);

    let hasError = false;
    if (!name.trim()) { setError("name", "Name is required"); hasError = true; }
    if (!origAmt || origAmt <= 0) { setError("orig", "Must be a positive integer"); hasError = true; }
    if (!total || total <= 0) { setError("total", "Must be a positive integer"); hasError = true; }
    if (paid < 0 || paid > total) { setError("paid", "Must be 0 – total"); hasError = true; }
    if (!payment || payment <= 0) { setError("payment", "Must be a positive integer"); hasError = true; }
    if (!Number.isFinite(rate) || rate < 0) { setError("rate", "Must be a non-negative number"); hasError = true; }
    if (endDate && !isYm(endDate)) { setError("end", "Use YYYY-MM format"); hasError = true; }
    if (hasError) return;

    const debt: Debt = {
      id: generateId(),
      name: name.trim(),
      principalRemaining,
      annualRate: rate,
      monthlyPayment: payment,
      startDate: null,
      endDate: endDate || null,
      categoryId: "cat-debt",
      active: true,
      note: note.trim() || `${paid}/${total} instalments`,
    };

    setSaving(true);
    const next: Database = { ...db, debts: [...db.debts, debt] };
    try {
      await saveDb(next);
      setSaved(true);
      setTimeout(() => onSaved(next), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Box paddingY={1}>
        <StatusMessage variant="success">Loan saved.</StatusMessage>
      </Box>
    );
  }

  if (saveError) {
    return (
      <Box paddingY={1}>
        <StatusMessage variant="error">{saveError}</StatusMessage>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Text bold color={palette.primary}>ADD LOAN</Text>

      <LoanTextField
        focusId="loan-name"
        autoFocus
        label="Name"
        placeholder="e.g. HSBC Loan"
        displayValue={name}
        error={errors["name"]}
        onChange={(v) => { setName(v); clearError("name"); }}
        onSubmit={(v) => { setName(v); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-orig"
        label="Original amount"
        placeholder="50000"
        prefix="$"
        displayValue={originalAmount}
        error={errors["orig"]}
        onChange={(v) => { setOriginalAmount(v.replace(/\D/g, "")); clearError("orig"); }}
        onSubmit={(v) => { setOriginalAmount(v.replace(/\D/g, "")); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-total"
        label="Total instalments"
        placeholder="24"
        suffix=" months"
        displayValue={totalInstalments}
        error={errors["total"]}
        onChange={(v) => { setTotalInstalments(v.replace(/\D/g, "")); clearError("total"); }}
        onSubmit={(v) => { setTotalInstalments(v.replace(/\D/g, "")); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-paid"
        label="Paid so far"
        placeholder="0"
        suffix=" months"
        displayValue={paidInstalments}
        error={errors["paid"]}
        onChange={(v) => { setPaidInstalments(v.replace(/\D/g, "")); clearError("paid"); }}
        onSubmit={(v) => { setPaidInstalments(v.replace(/\D/g, "")); focusNext(); }}
      />

      {principalRemaining > 0 && (
        <Box paddingLeft={20}>
          <Text color={palette.muted}>
            → {money(principalRemaining)} remaining ({remaining} of {total} months left)
          </Text>
        </Box>
      )}

      <LoanTextField
        focusId="loan-payment"
        label="Monthly payment"
        placeholder="1200"
        prefix="$"
        displayValue={monthlyPayment}
        error={errors["payment"]}
        onChange={(v) => { setMonthlyPayment(v.replace(/\D/g, "")); clearError("payment"); }}
        onSubmit={(v) => { setMonthlyPayment(v.replace(/\D/g, "")); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-rate"
        label="Annual rate %"
        placeholder="0 = interest-free"
        suffix="%"
        displayValue={annualRate}
        error={errors["rate"]}
        onChange={(v) => { setAnnualRate(v); clearError("rate"); }}
        onSubmit={(v) => { setAnnualRate(v); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-end"
        label="End date"
        placeholder="YYYY-MM (optional)"
        displayValue={endDate}
        error={errors["end"]}
        onChange={(v) => { setEndDate(v); clearError("end"); }}
        onSubmit={(v) => { setEndDate(v); focusNext(); }}
      />

      <LoanTextField
        focusId="loan-note"
        label="Note"
        placeholder="optional"
        displayValue={note}
        onChange={(v) => { setNote(v); }}
        onSubmit={(v) => { setNote(v); focusNext(); }}
      />

      {!saving && <LoanConfirmField onSubmit={handleSave} />}
    </Box>
  );
};

// --- sub-components --------------------------------------------------------

type LoanTextFieldProps = {
  focusId: string;
  autoFocus?: boolean;
  label: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  displayValue?: string;
  error?: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
};

const LoanTextField = ({
  focusId, autoFocus, label, placeholder, prefix, suffix, displayValue, error, onChange, onSubmit,
}: LoanTextFieldProps) => {
  const { isFocused } = useFocus({ id: focusId, autoFocus: autoFocus ?? false });
  const shown = displayValue && displayValue.length > 0;

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        <Box width={18}>
          <Text color={isFocused ? palette.primary : palette.muted}>{label}</Text>
        </Box>
        {prefix && <Text color={isFocused || shown ? undefined : palette.muted}>{prefix}</Text>}
        {isFocused ? (
          <TextInput placeholder={placeholder ?? ""} onChange={onChange} onSubmit={onSubmit} />
        ) : shown ? (
          <Text>{displayValue}{suffix ?? ""}</Text>
        ) : (
          <Text color={palette.muted}>{placeholder ?? ""}</Text>
        )}
      </Box>
      {error && (
        <Box paddingLeft={20}>
          <Text color={palette.negative}>{error}</Text>
        </Box>
      )}
    </Box>
  );
};

type LoanConfirmFieldProps = {
  onSubmit: (confirmed: boolean) => void;
};

const LoanConfirmField = ({ onSubmit }: LoanConfirmFieldProps) => {
  const { isFocused } = useFocus({ id: "loan-confirm" });

  if (!isFocused) {
    return (
      <Box paddingTop={1}>
        <Text color={palette.muted}>[Tab] to reach Save</Text>
      </Box>
    );
  }

  return (
    <Box gap={2} paddingTop={1}>
      <Text bold>Save loan? </Text>
      <ConfirmInput onConfirm={() => onSubmit(true)} onCancel={() => onSubmit(false)} />
    </Box>
  );
};
