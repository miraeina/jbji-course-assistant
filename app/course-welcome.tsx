export default function CourseWelcome({onChoose,fifthYear=false}:{onChoose:()=>void;fifthYear?:boolean}) {
  return <section className={`courseWelcome ${fifthYear?'fifthYearWelcome':''}`} aria-labelledby={fifthYear?'course-welcome-title':undefined} aria-label={fifthYear?undefined:'选择本学期课程'}>
    {fifthYear&&<div className="welcomeCopy">
      <h3 id="course-welcome-title">自由的龙儿是关不住的</h3>
      <p className="welcomeDescription">从各年级课程中，选出这学期要上的课。</p>
    </div>}
    <div className="welcomeArt" aria-hidden="true">
      {fifthYear?<picture><source media="(max-width:700px)" srcSet="./jbji-nailong-next-chapter.png"/><img src="./jbji-nailong-rain-banner.png" width="2172" height="724" fetchPriority="high" loading="eager" alt=""/></picture>:<img src="./jbji-nailong-guardian.webp" width="840" height="1060" fetchPriority="high" loading="eager" alt=""/>}
    </div>
    <div className="welcomeAction">
      <button type="button" onClick={onChoose}>{fifthYear?'添加课程':'选择课程'} <span aria-hidden="true">＋</span></button>
      <p>添加后即可查看安排与课程冲突</p>
    </div>
  </section>;
}
