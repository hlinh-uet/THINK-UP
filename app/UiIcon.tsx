import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, ChartNoAxesCombined, Check, ChevronDown, CircleHelp,
  Eye, EyeOff, FileText, Globe, GraduationCap, House, ListChecks, LoaderCircle, LogOut,
  Menu, MessageCircle, Paperclip, PenLine, Plus, ScanText, Search, Send, Settings2, Users, X,
} from 'lucide-react';

const icons = {
  overview: House, editor: PenLine, journey: BookOpen,
  actions: ListChecks, progress: ChartNoAxesCombined, lecturer: GraduationCap,
  admin: Settings2, help: CircleHelp, language: Globe, logout: LogOut,
  document: FileText, coach: MessageCircle, add: Plus, arrow: ArrowUpRight,
  next: ArrowRight, check: Check, close: X, users: Users, attachment: Paperclip, similarity: ScanText,
  menu: Menu, down: ArrowDown, up: ArrowUp, messages: MessageCircle, chevron: ChevronDown, search: Search, send: Send, spinner: LoaderCircle, eye: Eye, eyeOff: EyeOff,
};

export default function UiIcon({name, size=18, className=''}:{name:keyof typeof icons;size?:number;className?:string}) {
  const Icon=icons[name];
  return <Icon size={size} strokeWidth={1.8} className={`ui-icon ${className}`} aria-hidden="true" focusable="false"/>;
}
