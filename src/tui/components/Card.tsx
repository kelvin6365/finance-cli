import { Box, Text } from "ink";
import type { ReactNode } from "react";

import { BRAND } from "../branding.tsx";
import { palette } from "../theme.ts";

type Props = {
  title?: string;
  borderColor?: string;
  children: ReactNode;
};

export const Card = ({ title, borderColor, children }: Props) => (
  <Box
    flexDirection="column"
    borderStyle="round"
    borderColor={borderColor ?? palette.border}
    paddingX={1}
  >
    {title ? (
      <Box marginBottom={1}>
        <Text color={palette.primary}>{BRAND.sectionPrefix} </Text>
        <Text bold color={palette.text}>{title}</Text>
      </Box>
    ) : null}
    {children}
  </Box>
);
