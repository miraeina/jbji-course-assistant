// Manually transcribed from the source PDFs, using 1-based weekday/session numbers.
// JBJI timetable: pages 1–5. Single-degree arrangements: page 1 takes precedence.
const rows=[];
function add(id,year,audience,day,first,last,room,teacher,weeks,extra={}){
 rows.push({id,year,majors:audience==='all'?'all':audience.split(','),day:day-1,start:first-1,span:last-first+1,
  room:room||undefined,teacher:teacher||undefined,weeks:weeks||undefined,...extra});
}
// Page 1: English E1–E12, each row: Writing, Reading, Listening & Speaking.
const english=[
 ['MAM1','2,1,2,N422,Robert','3,10,11,N432,Dawid','5,6,7,N423,Joanne'],
 ['MAM2','2,1,2,N423,Joanne','3,8,9,N432,Dawid','5,1,2,N423,Joanne'],
 ['MAM3','3,8,9,N423,Laurence','2,10,11,N432,Dawid','2,1,2,N432,Henry'],
 ['ICS1','2,3,4,N422,Selene','2,1,2,N426,Dawid','3,1,2,N432,Henry'],
 ['ICS2','2,3,4,N423,Joanne','3,1,2,N422,Selene','1,6,7,N426,Robert'],
 ['ICS3','3,3,4,N423,Laurence','5,1,2,N432,Dawid','1,8,9,N426,Robert'],
 ['Econ1','2,6,7,N422,Selene','3,3,4,N432,Henry','1,3,4,N422,Selene'],
 ['Econ2','2,6,7,N423,Joanne','5,3,4,N432,Dawid','3,3,4,N422,Selene'],
 ['Econ3','1,6,7,N423,Laurence','3,8,9,N422,Selene','1,8,9,N423,Joanne'],
 ['Stat1','2,8,9,N422,Selene','5,3,4,N426,Henry','1,8,9,N422,Selene'],
 ['Stat2','1,8,9,N432,Laurence','2,8,9,N432,Dawid','1,6,7,N422,Selene'],
 ['Stat3','2,8,9,N426,Laurence','5,1,2,N426,Henry','5,3,4,N423,Joanne'],
];
english.forEach(([group,...sessions],i)=>sessions.forEach((value,j)=>{
 const [day,first,last,room,teacher]=value.split(',');
 add(`y1-en-${i*3+j}`,1,group.replace(/\d/g,''),+day,+first,+last,room,teacher,'4–18周',{groups:[group]});
}));
// Pages 1, 3, 4, 5: fixed JNU modules and fourth-year electives.
const fixed=`
y1-pe|MAM,ICS|1|1|2|体育场馆|体育部
y1-ide-mi|MAM,ICS|2|6|7|N415|张志刚
y1-ide-es|Econ,Stat|2|10|12|N415|张志刚
y1-military-mi|MAM,ICS|5|3|4|N415|李仲
y1-military-es|Econ,Stat|5|6|7|N415|李志
y1-mental-mam|MAM|4|3|4|待通知|刘可心
y1-mental-ics|ICS|4|3|4|待通知|李鹏扬
y1-mental-econ|Econ|3|6|7|待通知|王琳
y1-mental-stat|Stat|3|3|4|待通知|王琳
y1-c-mam|MAM|3|1|2|N419|吴祖剑
y1-c-mam-lab|MAM|3|3|4|N503/504|吴祖剑
y1-c-ics|ICS|3|8|9|N412|吴祖剑
y1-c-ics-lab|ICS|3|10|11|N514/515|吴祖剑
y1-pol-econ|Econ|3|10|12|N424|伍亚
y1-pol-stat|Stat|3|6|8|待通知|伍亚
y2-history-mi|MAM,ICS|1|6|8|N415|熊辉
y2-history-es|Econ,Stat|1|10|12|N415|熊辉
y2-pe|MAM,ICS|3|1|2|体育场馆|体育部
y2-matlab|MAM,ICS|3|3|4|N217|樊足志
y2-matlab-lab|MAM,ICS|3|6|7|MAM N504 / ICS N503|樊足志
y2-physics|MAM|2|6|7|N327|谌俊谋
y2-physics-2|MAM|4|3|4|N527|谌俊谋
y2-algebra-lab|ICS|2|3|4|N502|吴乐秦
y2-algebra|ICS|2|10|12|N410|吴乐秦
y2-micro|Econ,Stat|1|6|8|Econ N310 / Stat N410|郑立 / 邱筠
y2-money|Econ|3|6|8|知产207|李卓林
y2-statsoft|Stat|4|10|12|N504|王术
y3-marx|all|1|6|8|Econ/Stat N315 · MAM/ICS N217|黄漫 / 张一
y3-real|MAM|5|2|4|N211|郑奕钟
y3-topology|MAM|1|10|12|N411|赫海龙
y3-info|ICS|3|6|8|N509|赵山程
y3-algo-fri|ICS|5|3|4|N504|林义尊
y3-algo-thu|ICS|4|10|12|N412|林义尊
y3-macro|Econ,Stat|1|2|4|N415|王玮
y3-corp|Econ|3|6|8|N309|陈少凌
y3-invest|Econ|5|6|8|N305|龚雅婷
y3-stoch|Stat|3|6|8|N527|汪超男
y3-math-econ-1|Stat|2|3|4|N417|王文君
y3-math-econ-2|Stat|2|8|9|N504|王文君
y4-multi|all|1|6|8|N304|杨瑞霖
y4-history|all|2|10|12|N420|徐瑾辉
y4-public|Econ,Stat|4|6|8|N310|陆超云
y4-environment|Econ,Stat|4|10|12|N310|唐曲
y4-modelling|Econ,Stat|4|6|8|N410|陈苗苗
y4-causal|MAM,ICS|2|2|4|N311|范旭乾
y4-multivariate|MAM,ICS|3|6|8|N418|徐瑾辉
y4-intelligence|MAM,ICS|5|6|8|N311|王文君
y4-macro|MAM|1|6|8|N412|王玮
y4-data|ICS|3|6|9|N431|朱小红`;
for(const line of fixed.trim().split('\n')){
 const [id,audience,day,first,last,room,teacher]=line.split('|'),year=+id[1];
 add(id,year,audience,+day,+first,+last,room,teacher,year===1?'4–18周':'1–18周');
}
add('y1-art',1,'all',4,8,9,'','','',{listedOnly:true});
add('y1-geometry-retake',1,'all',5,10,12,'N428','','1–18周',{retakeOnly:true});
// Six rows of the dedicated single-degree PDF. GTMCD weekday differs from combined timetable.
for(const line of `
y1-single-ra|2|2|4|知产218|肖亮海|6–17周
y1-single-sas|2|8|9|N423|肖亮海|6–14周
y2-single-fm|2|10|12|N416|肖亮海|6–17周
y2-single-mva|4|3|5|N423|吴瑞雯|6–17周
y3-single-gtmcd|2|2|4|N418|戴天仕|6–17周
y3-single-ipco|3|2|4|N426|吴乐秦|6–17周`.trim().split('\n')){
 const [id,day,first,last,room,teacher,weeks]=line.split('|');add(id,+id[1],'all',+day,+first,+last,room,teacher,weeks,{track:'single'});
}
// Page 2–3: English options and group-specific IELTS sessions.
for(const [key,room,teacher] of [['culture','N432','Canyu Dai'],['identity','N426','Robert'],['practical','N423','Joanne']]){
 add(`y2-${key}-mi`,2,'MAM,ICS',1,3,4,room,teacher,'1–18周',{optional:true});
 add(`y2-${key}-es`,2,'Econ,Stat',1,1,2,room,teacher,'1–18周',{optional:true});
}
add('y2-culture-evening',2,'all',3,10,11,'N426','Canyu Dai','1–18周',{optional:true});
add('y2-literature-mi',2,'MAM,ICS',5,6,7,'N426','Dawid','1–18周',{optional:true});
add('y2-literature-es',2,'Econ,Stat',5,8,9,'N426','Dawid','1–18周',{optional:true});
for(const line of `
e1|MAM1|2|3|4|N432|Henry
e2|MAM2|2|3|4|N426|Laurence
e3|ICS1|2|6|7|N432|Henry
e4|ICS2|2|6|7|N426|Laurence
e5|Econ1|5|6|7|N432|Henry
e6|Econ2|3|1|2|N423|Laurence
e7|Stat1|3|6|7|N432|Henry
e8|Stat2|3|6|7|N423|Laurence`.trim().split('\n')){
 const [code,group,day,first,last,room,teacher]=line.split('|');
 add(`y2-ielts-${code}`,2,group.replace(/\d/g,''),+day,+first,+last,room,teacher,'1–18周',{groups:[group],optional:true});
}
// The three rotating pairs: same slots, distinct explicitly listed teaching weeks.
const modules={
 1:[['mfc','4–12周','Amin Farjudian & Shenggang Hu'],['sas','13–16周','Haoren Xiong']],
 2:[['fm','1–4、13–16周','Jia Shao'],['mva','5–12周','Maryam Parvizi & Michel van Garrel']],
 3:[['ipco','1–4、9–12周','Daniel Jones & Sergey Shpectorov'],['gtmcd','5–8、13–16周','Yi Zhang & Daniel Jones']],
};
for(const line of `
y1-found-mi-1|MAM,ICS|1|3|4|N315
y1-found-es-1|Econ,Stat|1|1|2|N315
y1-found-mi-2|MAM,ICS|3|6|7|N315
y1-found-es-2|Econ,Stat|3|1|2|N315
y1-found-mi-3|MAM,ICS|4|6|7|N415
y1-found-es-3|Econ,Stat|4|3|4|N114
y1-found-mon-seminar-mi|MAM,ICS|1|10|10|N315
y1-found-mon-seminar-es|Econ,Stat|1|11|11|N315
y1-found-mon-qa|all|1|12|12|N315
y1-found-thu-seminar-mi|MAM,ICS|4|10|10|N415
y1-found-thu-seminar-es|Econ,Stat|4|11|11|N415
y1-found-thu-qa|all|4|12|12|N415
y2-fmmva-mi-1|MAM,ICS|2|1|2|N315
y2-fmmva-es-1|Econ,Stat|2|3|4|N315
y2-fmmva-mi-2|MAM,ICS|4|1|2|N315
y2-fmmva-es-2|Econ,Stat|4|3|4|N315
y2-fmmva-es-wed|Econ,Stat|3|3|4|N315
y2-fmmva-mi-wed|MAM,ICS|3|8|9|N315
y2-seminar-es|Econ,Stat|2|7|7|N315
y2-seminar-mi|MAM,ICS|2|8|8|N315
y2-qa-tue|all|2|9|9|N315
y2-seminar-fri-es|Econ,Stat|5|1|1|N415
y2-seminar-fri-mi|MAM,ICS|5|2|2|N415
y2-qa-fri|all|5|3|3|N422
y3-ipco-es-tue|Econ,Stat|2|1|2|N415
y3-ipco-mi-tue|MAM,ICS|2|3|4|N415
y3-ipco-mi-wed|MAM,ICS|3|1|2|N415
y3-ipco-es-wed|Econ,Stat|3|3|4|N415
y3-ipco-mi-thu|MAM,ICS|4|1|2|N415
y3-ipco-es-thu|Econ,Stat|4|3|4|N415
y3-ipco-qa-tue|all|2|6|6|N217
y3-ipco-seminar-es-tue|Econ,Stat|2|7|7|N217
y3-ipco-seminar-mi-tue|MAM,ICS|2|8|8|N217
y3-ipco-qa-thu|all|4|7|7|N419
y3-ipco-seminar-mi-thu|MAM,ICS|4|8|8|N415
y3-ipco-seminar-es-thu|Econ,Stat|4|9|9|N415`.trim().split('\n')){
 const [id,audience,day,first,last,room]=line.split('|'),year=+id[1];
 for(const [code,weeks,teacher] of modules[year])add(`${id}-${code}`,year,audience,+day,+first,+last,room,teacher,weeks,{track:'dual'});
}
export const sourceRows=rows;
export const sourceRooms={
 'y2-matlab-lab':{MAM:'N504',ICS:'N503'},
 'y2-micro':{Econ:'N310',Stat:'N410'},
 'y3-marx':{Econ:'N315',Stat:'N315',MAM:'N217',ICS:'N217'},
};
