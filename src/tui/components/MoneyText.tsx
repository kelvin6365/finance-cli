import { Box, Text } from "ink";

import { money } from "../../core/format.ts";
import { BRAND } from "../branding.tsx";
import { palette } from "../theme.ts";

type Props = {
  value: number;
  signed?: boolean;
  bold?: boolean;
  // when true, zero is rendered with the muted color rather than positive/negative
  mutedZero?: boolean;
};

export const MoneyText = ({ value, signed, bold, mutedZero }: Props) => {
  const color =
    value > 0
      ? palette.positive
      : value < 0
        ? palette.negative
        : mutedZero
          ? palette.muted
          : undefined;
  return (
    <Text color={color} bold={bold}>
      {money(value, signed ? { signed: true } : {})}
    </Text>
  );
};

type RowProps = {
  label: string;
  amount: number;
  signed?: boolean;
  note?: string;
  labelWidth?: number;
  amountWidth?: number;
};

export const MoneyRow = ({
  label,
  amount,
  signed,
  note,
  labelWidth = 22,
  amountWidth = 10,
}: RowProps) => (
  <Box>
    <Text color={palette.muted}>{BRAND.moneyBullet} </Text>
    <Box width={labelWidth}>
      <Text color={palette.text}>{label}</Text>
    </Box>
    <Box width={amountWidth} justifyContent="flex-end">
      <MoneyText value={amount} signed={signed} />
    </Box>
    {note ? <Text color={palette.muted}>  {note}</Text> : null}
  </Box>
);
