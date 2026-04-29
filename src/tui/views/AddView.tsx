import { ConfirmInput, Select, StatusMessage, TextInput } from "@inkjs/ui";
import { Box, Text, useFocus, useFocusManager, useInput } from "ink";
import { useState } from "react";

import { today } from "../../core/date.ts";
import { saveDb } from "../../core/storage.ts";
import type { Database, TransactionType } from "../../core/types.ts";
import { palette } from "../theme.ts";

type Props = { db: Database; onSaved?: (next: Database) => void };

// These categories are managed elsewhere and should not appear in the transaction form.
const HIDDEN_CATEGORIES = new Set(["cat-debt", "cat-insurance"]);

const generateId = (): string =>
  `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const firstVisibleExpense = (db: Database): string => {
  // Prefer Food as the most common daily expense.
  const food = db.categories.find((c) => c.id === "cat-food");
  if (food) return food.id;
  return db.categories.find(
    (c) => c.type === "expense" && !HIDDEN_CATEGORIES.has(c.id),
  )?.id ?? "";
};

export const AddView = ({ db, onSaved }: Props) => {
  const { focusNext, focus } = useFocusManager();

  const [txType, setTxType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [categoryId, setCategoryId] = useState<string>(() => firstVisibleExpense(db));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const categories = db.categories.filter(
    (c) => c.type === txType && !HIDDEN_CATEGORIES.has(c.id),
  );
  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.id }));
  const effectiveCatId = categoryId || (categories[0]?.id ?? "");
  const catLabel = categoryOptions.find((o) => o.value === effectiveCatId)?.label ?? effectiveCatId;

  const handleSave = async (confirmed: boolean) => {
    if (!confirmed) {
      focus("type");
      return;
    }
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      setAmountError("Enter a positive integer amount");
      focus("amount");
      return;
    }
    setSaving(true);
    const newTxn = {
      id: generateId(),
      date: today(),
      amount: amt,
      type: txType,
      categoryId: effectiveCatId,
      note,
      createdAt: new Date().toISOString(),
    };
    const next: Database = {
      ...db,
      transactions: [...db.transactions, newTxn],
    };
    try {
      await saveDb(next);
      setSaved(true);
      setTimeout(() => onSaved?.(next), 1500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Box paddingY={1}>
        <StatusMessage variant="success">Transaction saved.</StatusMessage>
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
      <Text bold color={palette.primary}>
        ADD TRANSACTION
      </Text>

      <TypeField
        value={txType}
        onChange={(t) => {
          setTxType(t);
          const firstCat = db.categories.find(
            (c) => c.type === t && !HIDDEN_CATEGORIES.has(c.id),
          );
          setCategoryId(firstCat?.id ?? "");
          focusNext();
        }}
      />

      <AmountField
        value={amount}
        error={amountError}
        onChange={(v) => {
          setAmount(v);
          setAmountError("");
        }}
        onSubmit={(v) => {
          const n = parseInt(v, 10);
          if (!n || n <= 0) {
            setAmountError("Enter a positive integer amount");
          } else {
            setAmount(v);
            focusNext();
          }
        }}
      />

      <Box gap={2}>
        <Box width={12}>
          <Text color={palette.muted}>Category</Text>
        </Box>
        <CategoryField
          options={categoryOptions}
          defaultValue={effectiveCatId}
          displayLabel={catLabel}
          onChange={(v) => {
            setCategoryId(v);
            focusNext();
          }}
        />
      </Box>

      <NoteField
        value={note}
        onChange={setNote}
        onSubmit={(v) => {
          setNote(v);
          focusNext();
        }}
      />

      <Box gap={2}>
        <Box width={12}>
          <Text color={palette.muted}>Date</Text>
        </Box>
        <Text>{today()} (today)</Text>
      </Box>

      {!saving && <ConfirmField onSubmit={handleSave} />}
    </Box>
  );
};

// --- sub-components --------------------------------------------------------

type TypeFieldProps = {
  value: TransactionType;
  onChange: (t: TransactionType) => void;
};

const TypeField = ({ value, onChange }: TypeFieldProps) => {
  const { isFocused } = useFocus({ id: "type", autoFocus: true });

  useInput(
    (_input, key) => {
      if (key.leftArrow) { onChange("income"); return; }
      if (key.rightArrow) { onChange("expense"); return; }
      if (_input === "i") { onChange("income"); return; }
      if (_input === "e") { onChange("expense"); return; }
      if (key.return || key.tab) onChange(value);
    },
    { isActive: isFocused },
  );

  return (
    <Box gap={2}>
      <Box width={12}>
        <Text color={isFocused ? palette.primary : palette.muted}>Type</Text>
      </Box>
      <Text>
        <Text color={value === "income" ? palette.positive : palette.muted}>
          {value === "income" ? "(•)" : "( )"}
        </Text>
        <Text> </Text>
        <Text color={value === "income" ? palette.positive : palette.default}>Income</Text>
        <Text>   </Text>
        <Text color={value === "expense" ? palette.negative : palette.muted}>
          {value === "expense" ? "(•)" : "( )"}
        </Text>
        <Text> </Text>
        <Text color={value === "expense" ? palette.negative : palette.default}>Expense</Text>
      </Text>
      {isFocused && (
        <Text color={palette.muted}>  [i]/[e] or ←→</Text>
      )}
    </Box>
  );
};

type AmountFieldProps = {
  value: string;
  error: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
};

const AmountField = ({ value, error, onChange, onSubmit }: AmountFieldProps) => {
  const { isFocused } = useFocus({ id: "amount" });

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        <Box width={12}>
          <Text color={isFocused ? palette.primary : palette.muted}>Amount</Text>
        </Box>
        <Text>$ </Text>
        {isFocused ? (
          <TextInput
            placeholder="0"
            onChange={(v) => onChange(v.replace(/\D/g, ""))}
            onSubmit={onSubmit}
          />
        ) : (
          <Text color={value ? undefined : palette.muted}>{value || "0"}</Text>
        )}
      </Box>
      {error ? (
        <Box paddingLeft={14}>
          <Text color={palette.negative}>{error}</Text>
        </Box>
      ) : null}
    </Box>
  );
};

type CategoryFieldProps = {
  options: { label: string; value: string }[];
  defaultValue: string;
  displayLabel: string;
  onChange: (v: string) => void;
};

const CategoryField = ({ options, defaultValue, displayLabel, onChange }: CategoryFieldProps) => {
  const { isFocused } = useFocus({ id: "category" });

  if (!isFocused) {
    return <Text>{displayLabel}</Text>;
  }

  return (
    <Select
      options={options}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );
};

type NoteFieldProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
};

const NoteField = ({ value, onChange, onSubmit }: NoteFieldProps) => {
  const { isFocused } = useFocus({ id: "note" });

  return (
    <Box gap={2}>
      <Box width={12}>
        <Text color={isFocused ? palette.primary : palette.muted}>Note</Text>
      </Box>
      {isFocused ? (
        <TextInput
          placeholder="optional"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      ) : (
        <Text color={value ? undefined : palette.muted}>{value || "optional"}</Text>
      )}
    </Box>
  );
};

type ConfirmFieldProps = {
  onSubmit: (confirmed: boolean) => void;
};

const ConfirmField = ({ onSubmit }: ConfirmFieldProps) => {
  const { isFocused } = useFocus({ id: "confirm" });

  if (!isFocused) {
    return (
      <Box paddingTop={1}>
        <Text color={palette.muted}>[Tab] to reach Save</Text>
      </Box>
    );
  }

  return (
    <Box gap={2} paddingTop={1}>
      <Text bold>Save transaction? </Text>
      <ConfirmInput onConfirm={() => onSubmit(true)} onCancel={() => onSubmit(false)} />
    </Box>
  );
};
