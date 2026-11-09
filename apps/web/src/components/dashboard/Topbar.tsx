import { BellIcon, CalendarIcon, LightbulbIcon, SearchIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTodayPill, initialsOf } from "@/lib/dashboard-format";

type ActionsProps = {
  /** Their full name, for the avatar's initials. */
  fullName: string;
  avatarUrl?: string | null;
  /** Today, from the page (so a test can fix it). */
  today: Date;
};

/** Search, tips, notifications, today's date and the avatar: the right side of the top bar of a dashboard page. */
export function TopbarActions({ fullName, avatarUrl, today }: ActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:flex-nowrap">
      <InputGroup className="w-full rounded-full bg-surface sm:w-72 xl:w-80">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search" type="search" placeholder="Search content, campaign or keyword" />
      </InputGroup>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Tips" className="rounded-full bg-surface">
            <LightbulbIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Tips</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Notifications" className="rounded-full bg-surface">
            <BellIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <Badge variant="outline" className="h-10 gap-2 bg-surface px-3.5 type-body-m-xs">
        <CalendarIcon aria-hidden="true" />
        <time dateTime={today.toISOString()}>{formatTodayPill(today)}</time>
      </Badge>

      <Avatar size="lg" className="size-10">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className="bg-brand-500 text-neutral-950">{initialsOf(fullName)}</AvatarFallback>
      </Avatar>
    </div>
  );
}

type Props = ActionsProps & {
  /** The person's first name, for the greeting. */
  firstName: string;
  /** The product name: "Welcome to Postly, Puteri". */
  brand: string;
  subtitle: string;
};

/** The greeting on the left; the actions on the right. */
export function Topbar({ firstName, brand, fullName, avatarUrl, subtitle, today }: Props) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
      <div className="min-w-0">
        <h1 className="type-display-m-6 text-fg">
          Welcome to {brand}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 max-w-lg type-body-r-m text-fg">{subtitle}</p>
      </div>

      <TopbarActions fullName={fullName} avatarUrl={avatarUrl} today={today} />
    </header>
  );
}
