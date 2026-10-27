import { Box, Typography } from '@mui/material';
import { dateTime, words } from '../format';
import type { Stage } from '../types';
export function Timeline({ stages, historical = false }: { stages: Stage[]; historical?: boolean }) {
  return <ol className={`timeline ${historical ? 'historical' : ''}`} aria-label={historical ? 'Historical approval stages' : 'Current approval stages'}>
    {stages.map(stage => <li key={stage.id} className={`stage stage-${(stage.decision || stage.status).toLowerCase()}`}>
      <span className="stage-dot" aria-hidden="true">{stage.decision === 'APPROVED' ? '✓' : stage.decision === 'REJECTED' ? '×' : stage.decision === 'CHANGES_REQUESTED' ? '↩' : stage.ordinal}</span>
      <Box><Typography variant="body2" sx={{ fontWeight: 650 }}>{words(stage.roleRequired)} <span className="stage-state">{words(stage.decision || stage.status)}</span></Typography>
        <Typography variant="body2" color="text.secondary">{stage.assignee.name}</Typography>
        {stage.decidedAt && <Typography variant="caption" color="text.secondary">{dateTime(stage.decidedAt)}</Typography>}
        {stage.decisionComment && <Typography className="stage-comment" variant="body2">“{stage.decisionComment}”</Typography>}
      </Box>
    </li>)}
  </ol>;
}
