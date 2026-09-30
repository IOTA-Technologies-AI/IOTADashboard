import { Label } from 'src/components/label';

import { stageMeta } from './utils/stages';

// ----------------------------------------------------------------------

export function StageLabel({ stage, short = false, ...other }) {
  const meta = stageMeta(stage);
  return (
    <Label variant="soft" color={meta.color} {...other}>
      {short ? meta.short : meta.label}
    </Label>
  );
}
