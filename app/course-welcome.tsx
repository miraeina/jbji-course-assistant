export default function CourseWelcome({onChoose}:{onChoose:()=>void}) {
  return <section className="courseWelcome" aria-labelledby="course-welcome-title">
    <div className="welcomeCopy">
      <p className="welcomeEyebrow">新学期，慢慢安排</p>
      <h3 id="course-welcome-title">这学期，<br/>从第一门课开始。</h3>
      <p className="welcomeDescription">课表还是空的，奶龙已经就位。</p>
    </div>
    <div className="welcomeArt" aria-hidden="true">
      <img src="./jbji-nailong-guardian.webp" width="840" height="1060" fetchPriority="high" loading="eager" alt=""/>
    </div>
    <div className="welcomeAction">
      <button type="button" onClick={onChoose}>选择课程 <span aria-hidden="true">＋</span></button>
      <p>添加后即可查看安排与课程冲突</p>
    </div>
  </section>;
}
