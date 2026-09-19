export type ExportFields={title:string;room:string;teacher:string;note:string};
export type ExportLesson=ExportFields&{id:string;group:string;subtitle?:string;weeks:string;day:number;start:number;span:number;lane:number;laneCount:number;category:string;categoryLabel:string};
export type ExportEdits=Record<string,Partial<ExportFields>>;
export const editableFields=['title','room','teacher','note'] as const;
export function editedLesson(lesson:ExportLesson,edits:ExportEdits):ExportLesson{return {...lesson,...edits[lesson.id]}}
export function applyExportEdit(lessons:ExportLesson[],edits:ExportEdits,id:string,draft:ExportFields,scope:'one'|'course'):ExportEdits{
  const selected=lessons.find(lesson=>lesson.id===id);
  if(!selected)return edits;
  const current=editedLesson(selected,edits);
  const changed=editableFields.filter(field=>draft[field].trim()!==current[field]);
  const next={...edits};
  for(const lesson of lessons){
    if(lesson.id!==id&&(scope!=='course'||lesson.group!==selected.group))continue;
    const patch={...next[lesson.id]};
    for(const field of changed){const value=draft[field].trim();if(value===lesson[field])delete patch[field];else patch[field]=value;}
    if(Object.keys(patch).length)next[lesson.id]=patch;else delete next[lesson.id];
  }
  return next;
}
