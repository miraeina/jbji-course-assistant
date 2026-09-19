import type {TimetableEvent} from './timetable-data';
import {roomForMajor} from './schedule-logic';
import type {Major} from './timetable-data';

type FeedbackContext={profile:string;week:string;major:Major;course?:TimetableEvent};
export function timetableFeedbackUrl({profile,week,major,course}:FeedbackContext){
  const title=course?`课表纠错：${course.shortTitle||course.title}`:'课表纠错';
  const courseInfo=course?[
    `- 课程：${course.title}${course.shortTitle?'（'+course.shortTitle+'）':''}`,
    `- 课程 ID：${course.id}`,
    `- 课程年级：大${['一','二','三','四'][course.year-1]}`,
    `- 时间：周${['一','二','三','四','五'][course.day]}，第 ${course.start+1}–${course.start+course.span} 节`,
    `- 周次：${course.weeks||'原始资料未注明'}`,
    `- 教室：${roomForMajor(course,major)}`,
    `- 教师：${course.teacher||'原始资料未注明'}`,
  ].join('\n'):'- 课程名称及上课安排：请填写（漏课也可在此说明）';
  const body=`### 当前课表\n- 学期：2026–27 第一学期\n- 查看身份：${profile}\n- 查看范围：${week}\n${courseInfo}\n\n### 哪里有误\n请描述网站显示的错误或遗漏。\n\n### 正确信息\n请填写正确内容，并说明影响哪些专业、班级和日期／周次。\n\n### 核对依据\n请提供学院通知、课表或教务资料的链接；也可在此上传相关截图，并注明通知日期。\n\n---\n反馈提交后由维护者核实，不会自动修改公共课表。`;
  return `https://github.com/miraeina/jbji-course-assistant/issues/new?${new URLSearchParams({title,body})}`;
}
