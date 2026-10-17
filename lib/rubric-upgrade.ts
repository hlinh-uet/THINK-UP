import { defaultRubric, sectionKeys } from './domain.ts';

/** Upgrade live configuration only. Historical analysis/review snapshots stay untouched. */
export async function upgradeRubricSettings(db:D1Database) {
  const [{results:courses},system]=await Promise.all([
    db.prepare('SELECT id,rubric_json FROM courses').all<{id:string;rubric_json:string}>(),
    db.prepare("SELECT value FROM settings WHERE key='rubric'").first<{value:string}>(),
  ]);
  const updates:D1PreparedStatement[]=[];
  const next=JSON.stringify(defaultRubric);
  function legacy(value:string){const parsed=JSON.parse(value),v2=structuredClone(defaultRubric);v2[2].descriptions[3]='Bài học có tính khái quát hóa cao, có thể làm nguyên tắc chỉ đạo cho tình huống tương lai.';return Array.isArray(parsed)&&parsed.length===4&&(parsed.every((c,i)=>c?.key===sectionKeys[i])||JSON.stringify(parsed)===JSON.stringify(v2));}
  function sourceVersion(value:string){return JSON.parse(value)[0]?.key===sectionKeys[0]?'v1':'v2';}
  if(system&&legacy(system.value))updates.push(
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(`rubric-archive:system:${sourceVersion(system.value)}`,system.value),
    db.prepare("UPDATE settings SET value=? WHERE key='rubric' AND value=?").bind(next,system.value),
  );
  for(const course of courses)if(legacy(course.rubric_json))updates.push(
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(`rubric-archive:course:${course.id}:${sourceVersion(course.rubric_json)}`,course.rubric_json),
    db.prepare('UPDATE courses SET rubric_json=? WHERE id=? AND rubric_json=?').bind(next,course.id,course.rubric_json),
  );
  if(updates.length)await db.batch(updates);
}
