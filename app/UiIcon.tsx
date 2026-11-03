import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Award, BookOpen, Bot, ClipboardCheck, Lightbulb, Target, ThumbsUp, TrendingUp, ChartNoAxesCombined, Check, ChevronDown, CircleHelp,
  Eye, EyeOff, FileText, Flame, Globe, GraduationCap, House, ListChecks, LoaderCircle, LogOut, MapPin,
  Menu, MessageCircle, MessagesSquare, Paperclip, PenLine, Plus, ScanText, Search, Send, Settings2, Sparkles, Users, X,
} from 'lucide-react';

const icons = {
  back: ArrowLeft, bot: Bot, selfCheck: ClipboardCheck, idea: Lightbulb, thumbsUp: ThumbsUp, grow: TrendingUp, target: Target, award: Award, pin: MapPin,
  overview: House, editor: PenLine, journey: BookOpen, streak: Flame,
  actions: ListChecks, progress: ChartNoAxesCombined, lecturer: GraduationCap,
  admin: Settings2, help: CircleHelp, language: Globe, logout: LogOut, MapPin,
  document: FileText, coach: MessageCircle, add: Plus, arrow: ArrowUpRight,
  next: ArrowRight, check: Check, close: X, users: Users, attachment: Paperclip, similarity: ScanText,
  menu: Menu, down: ArrowDown, up: ArrowUp, messages: MessageCircle, community: MessagesSquare, chevron: ChevronDown, search: Search, send: Send, spinner: LoaderCircle, eye: Eye, eyeOff: EyeOff, sparkle: Sparkles,
};

export default function UiIcon({name, size=18, className=''}:{name:keyof typeof icons;size?:number;className?:string}) {
  const Icon=icons[name];
  return <Icon size={size} strokeWidth={1.8} className={`ui-icon ${className}`} aria-hidden="true" focusable="false"/>;
}
