import { useEffect, useState } from 'react';
import { ThemePicker } from './theme';

const documents = [
  {id:'timetable', title:'双学位总课表', term:'2026–27 学年 · 第一学期', description:'按年级、专业和班组核对原始课程安排。', file:'26-27-1-JBJI-Timetable.pdf', original:'26-27-1-JBJI-Timetable.pdf'},
  {id:'single', title:'单学位授课安排', term:'2026–27 学年 · 第一学期', description:'暨南大学学位（伯大必修课程）的授课时间与安排。', file:'26-27-1-single-degree.pdf', original:'26-27-1 暨南大学学位（伯大必修课程）授课安排.pdf'},
  {id:'calendar', title:'学年校历', term:'2026–2027 学年', description:'查看学期起止、教学周及校历中的其他安排。', file:'2026-2027-calendar.pdf', original:'2026-2027学年校历.pdf'},
];
const documentUrl = (file:string) => `${import.meta.env.BASE_URL}documents/${file}`;

export default function Materials(){
  const [selected,setSelected]=useState(documents[0]);
  const [desktop,setDesktop]=useState(false);
  useEffect(()=>{
    const query=window.matchMedia('(min-width: 801px)');
    const update=()=>setDesktop(query.matches);
    update(); query.addEventListener('change',update);
    const previousTitle=document.title;
    document.title='原始资料 · JBJI 课表助手';
    return ()=>{query.removeEventListener('change',update);document.title=previousTitle};
  },[]);
  return <main className="materialsPage">
    <header className="topbar"><a className="brand" href="#top"><span className="brandMark"><img className="brandLogo" src="./jbji-logo.png" alt="暨南大学与伯明翰大学院徽"/></span><span className="brandCopy"><strong>JBJI 课表助手</strong><small>原始资料</small></span></a><div className="headerActions"><ThemePicker/><a className="backToSchedule" href="#top">返回课表</a><a className="mascotDownload" href={`${import.meta.env.BASE_URL}jbji-nailong-guardian.png`} download="暨伯奶龙.png" title="下载奶龙原图（PNG）">JBJI奶龙 <span aria-hidden="true">↓</span></a></div></header>
    <section className="materialsIntro"><h1>原始课表与校历</h1><p>网站使用的三份原始文件，可预览或下载。</p><p className="materialsSource">临时调课请以学院最新通知为准。</p></section>
    <div className="materialsLayout">
      <section className="documentList" aria-label="选择原始资料">{documents.map(item=><article key={item.id} className={`documentCard ${desktop&&selected.id===item.id?'selected':''}`}>
        <span className="documentType">PDF · {item.term}</span><h2>{item.title}</h2><p>{item.description}</p><small className="documentFilename">{item.original}</small>
        <div className="documentActions">{desktop?<button aria-pressed={selected.id===item.id} onClick={()=>setSelected(item)}>{selected.id===item.id?'正在预览':'预览文件'}</button>:<a href={documentUrl(item.file)} target="_blank" rel="noreferrer">全屏阅读 ↗</a>}<a href={documentUrl(item.file)} download={item.original}>下载原文件</a></div>
      </article>)}</section>
      {desktop&&<section className="documentPreview" aria-label="PDF 预览"><div className="documentPreviewHead"><h2>{selected.title}</h2><a href={documentUrl(selected.file)} target="_blank" rel="noreferrer">新窗口打开 ↗</a></div><p className="previewHint">若浏览器未显示预览，可使用“新窗口打开”或下载原文件阅读。</p><iframe key={selected.id} title={`${selected.title} PDF 预览`} src={documentUrl(selected.file)} /></section>}
    </div>
  </main>;
}
