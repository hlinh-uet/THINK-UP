import type {ReactNode} from 'react';

// A shared visible page title; dense views can keep the title available to screen readers only.
export default function WorkspacePageHeading({title,description,visible=false,children}:{title:string;description?:ReactNode;visible?:boolean;children?:ReactNode}) {
 if(visible)return <header className="student-page-title"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children&&<div className="student-page-title-actions">{children}</div>}</header>;
 return <><h1 className="sr-only">{title}</h1>{children&&<div className="workspace-page-actions">{children}</div>}</>;
}
