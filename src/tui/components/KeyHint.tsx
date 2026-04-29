import { Text } from "ink";

import { palette } from "../theme.ts";

type Props = {
  keyName: string;
  label: string;
};

export const KeyHint = ({ keyName, label }: Props) => (
  <Text>
    <Text bold color={palette.primary}>
      [{keyName}]
    </Text>{" "}
    <Text color={palette.muted}>{label}</Text>
  </Text>
);
