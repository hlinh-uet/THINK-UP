'use client';
import {useState} from 'react';
export default function UserAvatar({person,className=''}:{person:{name:string;avatarUrl?:string};className?:string}) {
  const [failed,setFailed]=useState('');
  return <span className={`avatar ${className}`}>
    {person.avatarUrl&&failed!==person.avatarUrl?
      // The authenticated image API must retain the browser's same-origin cookie.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={person.avatarUrl} alt="" width={96} height={96} onError={()=>setFailed(person.avatarUrl!)}/>
      :person.name.charAt(0)}
  </span>;
}
