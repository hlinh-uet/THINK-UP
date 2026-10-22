import type {ReactNode} from 'react';

// The active navigation names the page visually; retain its heading for assistive technology.
export default function WorkspacePageHeading({title,children}:{title:string;children?:ReactNode}) {
 return <><h1 className="sr-only">{title}</h1>{children&&<div className="workspace-page-actions">{children}</div>}</>;
}
