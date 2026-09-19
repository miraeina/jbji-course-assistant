# JBJI 课表助手

暨南大学伯明翰大学联合学院本科生课表工具 · 2026–27 学年第一学期

学院的课表把四个专业放在一起，找自己班的课不太方便。这个网站把合并课表按学位、年级、专业和班级拆开，方便平时查课，也可以下载保存。

**[打开课表助手 →](https://miraeina.github.io/jbji-course-assistant/)**

## 功能

- **查看班级课表**：支持双学位 / 单学位、大一至大四，以及 MAM、ICS、ECON、STAT 四个专业和对应班级。
- **按周查课**：查看整学期或指定教学周的安排，点击课程查看教师、教室和上课周次；手机上可切换单日视图。
- **添加选修与重修**：大二英语课程、大四选修课和重修课程可手动加入课表，支持预览和时间冲突提示。
- **下载课表**：导出图片或 PDF；下载前可临时修改课程名称、教室、教师和备注，生成个人编辑版。
- **调整配色**：九套预设配色，也可自定义界面和课程颜色，导入、导出配色文件。下载的课表沿用所选颜色。

右上角还放了「JBJI奶龙」原图下载入口。

## 怎么用

打开网站，选好学位、年级、专业和班级即可。需要英语选课、选修课或重修课时，再手动添加，最后通过「导出课表」保存。

无需注册。身份、选课和配色会保存在当前浏览器，换设备不会自动同步；下载前的临时编辑仅用于个人副本，退出编辑后不保存，也不会改动网站原始课表。网站中的选课仅用于排课，仍需在学校系统完成正式选课。

## 资料与纠错

课程和教学周依据以下资料整理，网站内也可查看原文件：

- [2026–27 学年第一学期学院课表](public/documents/26-27-1-JBJI-Timetable.pdf)
- [单学位伯大必修课程授课安排](public/documents/26-27-1-single-degree.pdf)
- [2026–2027 学年校历](public/documents/2026-2027-calendar.pdf)

这是学生自制的非官方工具。临时调课、教室变更等请以学校及学院最新通知为准。发现错误可以点击网站中的「课表纠错」，或[提交 Issue](https://github.com/miraeina/jbji-course-assistant/issues)，附上课程信息和通知来源。

## 参考与许可

界面与使用方式参考了 [CityUDG Course Assistant](https://github.com/hxh2002/CityUDG-Course-Assistant) 和 [CityUDS Courses 2627](https://char1es-emp.github.io/CityUDS-courses-2627/index.html)。本项目的课程数据来自上述 JBJI 资料。

代码使用 [MIT License](LICENSE)。`public/jbji-logo.png` 与 `public/jbji-banner.jpg` 来源于[学院官网](https://birmingham.jnu.edu.cn/)，相关校徽、名称与图片权利归暨南大学、伯明翰大学及学院所有，不包含在 MIT 软件许可中。
