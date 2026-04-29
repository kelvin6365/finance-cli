import { Box, Text } from "ink";

import { BRAND } from "../branding.tsx";
import { palette } from "../theme.ts";

export const Banner = () => (
  <Box flexDirection="column" alignItems="center" paddingY={1}>
    <Text bold color={palette.primary}>
      {BRAND.app}
    </Text>
    <Text color={palette.muted}>{BRAND.tagline}</Text>
  </Box>
);
