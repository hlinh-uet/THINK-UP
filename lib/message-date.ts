import type { Language } from './i18n.ts';

export const messageTimeZone='Asia/Ho_Chi_Minh';
const formatter=new Intl.DateTimeFormat('en-GB',{
  timeZone:messageTimeZone,numberingSystem:'latn',hourCycle:'h23',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
});
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** The SSR and browser must use the same zone and text, including at midnight.
 * Numeric parts avoid differences in localized punctuation between ICU versions.
 */
export function formatMessageTimestamp(value:string,language:Language) {
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return {time:'—',date:'—',dayKey:''};
  const parts=Object.fromEntries(formatter.formatToParts(date).map(part=>[part.type,part.value]));
  const {year,month,day,hour,minute}=parts;
  return {
    time:`${hour}:${minute}`,
    date:language==='vi'?`${day}/${month}/${year}`:`${Number(day)} ${months[Number(month)-1]} ${year}`,
    dayKey:`${year}-${month}-${day}`,
  };
}
