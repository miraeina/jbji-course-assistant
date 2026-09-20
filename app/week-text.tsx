import {Fragment} from 'react';

// Keep each numeric week range with its unit; wrap between ranges instead.
export default function WeekText({value}:{value:string}){
  return <>{value.split(/(\d+(?:\s*[–—-]\s*\d+)?(?:周)?)/g).map((part,index)=>
    /^\d/.test(part)?<span className="weekRange" key={index}>{part}</span>:<Fragment key={index}>{part}</Fragment>
  )}</>;
}
