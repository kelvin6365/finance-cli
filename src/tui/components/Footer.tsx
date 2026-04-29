import { Box, Text } from "ink";

import { palette } from "../theme.ts";

type Hint = { key: string; label: string };

type Props = { hints: Hint[] };

export const Footer = ({ hints }: Props) => (
  <Box>
    {hints.map((h, i) => (
      <Box key={h.key} marginRight={i === hints.length - 1 ? 0 : 2}>
        <Text color={palette.accent}>[{h.key}]</Text>
        <Text color={palette.muted}> {h.label}</Text>
      </Box>
    ))}
  </Box>
);
