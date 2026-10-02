import { useState, type CSSProperties } from 'react';
import { welcomePreview } from './welcome-preview';

export default function CourseWelcome({onChoose,fifthYear=false}:{onChoose:()=>void;fifthYear?:boolean}) {
  const [loaded,setLoaded]=useState(false);
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const retrySuffix=attempt?`?retry=${attempt}`:'';
  const rainStyle={ '--rain-preview':`url("${welcomePreview.desktop}")`, '--rain-preview-mobile':`url("${welcomePreview.mobile}")` } as CSSProperties;
  return <section className={`courseWelcome ${fifthYear?'fifthYearWelcome':''}`} aria-labelledby={fifthYear?'course-welcome-title':undefined} aria-label={fifthYear?undefined:'选择本学期课程'}>
    {fifthYear&&<div className="welcomeCopy">
      <h3 id="course-welcome-title">自由的龙儿是关不住的</h3>
      {failed&&<button className="welcomeImageRetry" type="button" onClick={()=>{setFailed(false);setLoaded(false);setAttempt(value=>value+1)}}>雨景高清图加载失败，点此重试</button>}
    </div>}
    <div className="welcomeArt" aria-hidden="true">
      {fifthYear?<picture style={rainStyle} className={loaded?'rainLoaded':''}>
        <source media="(max-width:700px)" srcSet={`./jbji-rain-mobile-480.webp${retrySuffix} 480w, ./jbji-rain-mobile-800.webp${retrySuffix} 800w`} sizes="calc(100vw - 24px)"/>
        <img key={attempt} src={`./jbji-rain-desktop-1400.webp${retrySuffix}`} srcSet={`./jbji-rain-desktop-900.webp${retrySuffix} 900w, ./jbji-rain-desktop-1400.webp${retrySuffix} 1400w`} sizes="(min-width:1320px) 1400px, calc(100vw - 48px)" width="1400" height="467" fetchPriority="high" loading="eager" decoding="async" onLoad={()=>{setLoaded(true);setFailed(false)}} onError={()=>{setLoaded(false);setFailed(true)}} alt=""/>
      </picture>:<img src="./jbji-nailong-guardian.webp" width="840" height="1060" fetchPriority="high" loading="eager" alt=""/>}
    </div>
    <div className="welcomeAction">
      <button type="button" onClick={onChoose}>{fifthYear?'添加课程':'选择课程'} <span aria-hidden="true">＋</span></button>
      {fifthYear&&<p className="welcomeDescription">可根据自身情况选择课程</p>}
      <p>添加后即可查看安排与课程冲突</p>
    </div>
  </section>;
}
