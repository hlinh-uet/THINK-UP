export type CoachTurn={id:string;question:string;reply:string|null;status:string;provider:string|null;included_attachments:number;created_at:string};

// A slow history request must not erase a reply that arrived after that request began.
export function mergeCoachTurns(current:CoachTurn[],incoming:CoachTurn[]):CoachTurn[] {
  const turns=new Map(current.filter(turn=>turn.status==='completed').map(turn=>[turn.id,turn]));
  for(const turn of incoming) {
    const existing=turns.get(turn.id);
    if(existing?.status==='completed'&&turn.status!=='completed')continue;
    turns.set(turn.id,turn);
  }
  return [...turns.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at));
}
