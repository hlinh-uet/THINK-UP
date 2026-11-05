'use client';
import { useState } from 'react';
import { levelNames, levelRanges } from '../lib/assessment';
import type { Criterion } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';

type Props = {
  rubric: Criterion[];
  savedRubric: Criterion[];
  canEditName: boolean;
  index: number;
  onSelect: (index: number) => void;
  onEdit: (index: number, value: Partial<Criterion>) => void;
  language: Language;
};

/** Keep selection outside the editor so failed save validation can reveal the affected criterion. */
export default function CourseRubricEditor({ rubric, savedRubric, canEditName, index, onSelect, onEdit, language }: Props) {
  const tr = (text: string, args: readonly unknown[] = []) => translate(text, language, args);
  const [preview, setPreview] = useState(false);
  const selected = rubric[index];
  const isEdited = (criterion: Criterion) => {
    const saved = savedRubric.find(row => row.key === criterion.key);
    return !!saved && (saved.name !== criterion.name || saved.weight !== criterion.weight || saved.descriptions.some((text, k) => text !== criterion.descriptions[k]));
  };
  const total = rubric.reduce((sum, criterion) => sum + criterion.weight, 0);
  const weightsChanged = rubric.some(criterion => savedRubric.find(row => row.key === criterion.key)?.weight !== criterion.weight);
  return <section className="course-rubric" aria-label={tr('Rubric đánh giá')}>
    <header className="course-rubric-heading">
      <div><span className="course-settings-eyebrow">{tr('KHUNG ĐÁNH GIÁ')}</span><h3>{tr('Tùy chỉnh rubric')}</h3><p>{tr('Chọn tiêu chí để điều chỉnh trọng số và mô tả 4 mức điểm.')}</p></div>
      <button type="button" className="lx-btn" aria-expanded={preview} aria-controls="course-rubric-preview" onClick={() => setPreview(!preview)}><UiIcon name={preview ? 'close' : 'eye'} size={15}/>{tr(preview ? 'Đóng bản xem trước' : 'Xem toàn bộ rubric')}</button>
    </header>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The wide table scrolls sideways, so keyboard users must be able to focus it. */}
    <div id="course-rubric-preview" hidden={!preview} className="course-rubric-preview" tabIndex={0} role="region" aria-label={tr('Xem toàn bộ rubric')}>
      <table><caption>{tr('Rubric hiện tại · Bản đang chỉnh sửa')}</caption><thead><tr><th scope="col">{tr('Tiêu chí')}</th>{levelRanges.map((range, k) => <th scope="col" key={k}>{tr('Mức {0}', [k + 1])}<small>{range[0]}–{range[1]} / 10</small></th>)}</tr></thead>
        <tbody>{rubric.map(criterion => <tr key={criterion.key}><th scope="row">{criterion.name}<small>{criterion.weight}%</small></th>{criterion.descriptions.map((text, k) => <td key={k}>{text}</td>)}</tr>)}</tbody></table>
    </div>
    <div className="course-rubric-workspace">
      <aside className="course-rubric-sidebar">
        <div className="course-rubric-sidebar-head"><b>{tr('Tiêu chí đánh giá')}</b><span>{tr('{0} tiêu chí', [rubric.length])}</span></div>
        <nav aria-label={tr('Chọn tiêu chí')}>{rubric.map((criterion, i) => <button type="button" key={criterion.key} aria-pressed={i === index} aria-controls="course-rubric-detail" onClick={() => onSelect(i)}>
          <span className="course-rubric-index">{String(i + 1).padStart(2, '0')}</span>
          <span className="course-rubric-choice"><b>{criterion.name}</b><span><strong>{criterion.weight}%</strong>{isEdited(criterion) && <small>{tr('Đã chỉnh sửa')}</small>}</span><i aria-hidden="true"><i style={{ width: `${criterion.weight}%` }}/></i></span>
          <UiIcon name="next" size={14}/>
        </button>)}</nav>
        <div className={`course-rubric-total${total === 100 ? '' : ' is-invalid'}`}><span>{tr('Tổng trọng số')}</span><b>{total}<small>%</small></b></div>
        <p className="course-rubric-policy"><UiIcon name="help" size={15}/>{tr(total !== 100 ? 'Tổng trọng số cần đúng 100% mới lưu được.' : weightsChanged ? 'Bài đã chấm giữ điểm cũ. Bài chấm sau khi lưu sẽ tính theo trọng số mới.' : 'Các đánh giá đã có giữ nguyên rubric tại thời điểm chấm.')}</p>
      </aside>
      {selected && <section className="course-rubric-detail" id="course-rubric-detail" aria-label={tr('Tiêu chí {0}', [index + 1])}>
        <header className="course-rubric-detail-head"><div><span className="course-settings-eyebrow">{tr('Tiêu chí {0} / {1}', [index + 1, rubric.length])}</span><h4>{selected.name}</h4></div><label className="course-rubric-weight"><span><input type="number" required min={1} max={100} step={1} aria-label={tr('Trọng số (%)')} value={selected.weight || ''} onChange={event => onEdit(index, { weight: Number(event.target.value) })}/><b>%</b></span>{tr('trọng số')}</label></header>
        {canEditName && <label className="lx-field course-rubric-name"><span>{tr('Tên tiêu chí')}</span><input required maxLength={120} value={selected.name} onChange={event => onEdit(index, { name: event.target.value })}/></label>}
        <div className="course-rubric-levels">{selected.descriptions.map((text, k) => <label key={`${selected.key}-${k}`} className={`course-rubric-level is-level-${k + 1}`}>
          <span className="course-rubric-level-head"><span><b>{tr('Mức {0}', [k + 1])}</b><span>{tr(levelNames[k])}</span></span><strong>{levelRanges[k][0]}–{levelRanges[k][1]}<small> / 10</small></strong></span>
          <textarea required rows={4} maxLength={1000} aria-label={tr('Mô tả mức {0}', [k + 1])} value={text} onChange={event => onEdit(index, { descriptions: selected.descriptions.map((value, n) => n === k ? event.target.value : value) })}/>
        </label>)}</div>
        <footer className="course-rubric-footer"><span>{tr('Mô tả hành vi có thể quan sát ở từng mức điểm.')}</span><div><button type="button" className="lx-btn" disabled={index === 0} onClick={() => onSelect(index - 1)} aria-label={tr('Tiêu chí trước')}><UiIcon name="back" size={15}/></button><button type="button" className="lx-btn" disabled={index === rubric.length - 1} onClick={() => onSelect(index + 1)}>{tr('Tiêu chí tiếp theo')}<UiIcon name="next" size={15}/></button></div></footer>
      </section>}
    </div>
  </section>;
}
