import { ProgressBar } from "@inkjs/ui";
import { Box, Text } from "ink";

import { percent } from "../../core/format.ts";
import { MoneyText } from "./MoneyText.tsx";

type Props = {
  label: string;
  value: number;
  max: number;
  // optional secondary label, e.g. "(target $57,500)"
  detail?: string;
};

export const ProgressRow = ({ label, value, max, detail }: Props) => {
  const ratio = max > 0 ? value / max : 0;
  const pctValue = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <Box>
      <Box width={10}>
        <Text>{label}</Text>
      </Box>
      <Box width={12}>
        <MoneyText value={value} />
      </Box>
      {detail ? (
        <Box width={20}>
          <Text dimColor>{detail}</Text>
        </Box>
      ) : null}
      <Box width={14} marginRight={1}>
        <ProgressBar value={pctValue} />
      </Box>
      <Text>{percent(ratio)}</Text>
    </Box>
  );
};
