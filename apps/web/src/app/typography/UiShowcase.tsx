"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SettingsIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Europe/Paris", "America/New_York"];

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="type-head-sb-6 text-fg">{title}</h2>
      {note && <p className="mt-0.5 type-body-r-s text-muted">{note}</p>}
      <div className="card mt-3 space-y-5 p-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-28 shrink-0 type-body-sb-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Dev-only gallery of components/ui, to check them by eye next to the Figma file. */
export function UiShowcase() {
  const [day, setDay] = useState<Date | undefined>(new Date());
  const [zone, setZone] = useState("Asia/Jakarta");
  const [comboOpen, setComboOpen] = useState(false);
  const [view, setView] = useState("list");

  return (
    <div className="mt-14">
      <h1 className="type-head-sb-4 text-fg">Components</h1>
      <p className="mt-1 type-body-r-s text-muted">
        shadcn/ui on the Postly tokens, in <code className="type-mono-r-s text-fg">src/components/ui</code>. Dev only.
      </p>

      <Section title="Button" note="Variants copy the old btn-* classes. Heights: 38px, 40px with a border.">
        <Row label="variant">
          <Button>Add content</Button>
          <Button variant="secondary">Import plan</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="destructive-outline">Disconnect</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="size">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" variant="secondary" aria-label="Settings"><SettingsIcon /></Button>
          <Button size="icon-sm" variant="secondary" aria-label="Delete"><Trash2Icon /></Button>
        </Row>
        <Row label="with icon">
          <Button><PlusIcon /> New post</Button>
          <Button variant="secondary"><PlusIcon className="w-3" /> Own icon size kept</Button>
        </Row>
        <Row label="state">
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button asChild><Link href="/compose">As a link</Link></Button>
        </Row>
        <div className="rounded-2xl bg-neutral-900 p-5">
          <Button variant="auth">Log in</Button>
        </div>
      </Section>

      <Section title="Badge and Alert" note="Status colours from CLAUDE.md: 50 fill, 200 border, 700 text.">
        <Row label="badge">
          <Badge>Default</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Live</Badge>
          <Badge variant="danger">Failed</Badge>
          <Badge variant="warning">In review</Badge>
          <Badge variant="info">Scheduled</Badge>
          <Badge variant="outline">Outline</Badge>
        </Row>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert variant="success"><CheckIcon /><AlertTitle>Saved</AlertTitle><AlertDescription>Your plan was imported.</AlertDescription></Alert>
          <Alert variant="danger"><AlertTitle>Could not publish</AlertTitle><AlertDescription>The token has expired.</AlertDescription></Alert>
          <Alert variant="warning"><AlertTitle>Trial ends soon</AlertTitle><AlertDescription>3 days left.</AlertDescription></Alert>
          <Alert variant="info"><AlertTitle>Tip</AlertTitle><AlertDescription>Drag a post to reschedule it.</AlertDescription></Alert>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="ui-name">Name</Label><Input id="ui-name" placeholder="Puteri" /></div>
          <div className="space-y-1.5"><Label htmlFor="ui-bad">Invalid</Label><Input id="ui-bad" aria-invalid defaultValue="not an email" /></div>
          <div className="space-y-1.5"><Label htmlFor="ui-off">Disabled</Label><Input id="ui-off" disabled defaultValue="Locked" /></div>
          <div className="space-y-1.5">
            <Label htmlFor="ui-native">Native select</Label>
            <NativeSelect id="ui-native" defaultValue="09"><NativeSelectOption value="09">09</NativeSelectOption><NativeSelectOption value="10">10</NativeSelectOption></NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Select (Radix)</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger><SelectValue placeholder="Timezone" /></SelectTrigger>
              <SelectContent>{TIMEZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ui-text">Textarea</Label><Textarea id="ui-text" rows={3} placeholder="Write a caption" /></div>
        </div>
        <Row label="check / switch">
          <label className="flex items-center gap-2 type-body-r-s"><Checkbox defaultChecked /> Keep me logged in</label>
          <Switch aria-label="Design review" defaultChecked />
          <Switch aria-label="Small" size="sm" />
        </Row>
        <div className="rounded-2xl bg-neutral-900 p-5">
          <Input variant="line" placeholder="Email (auth panel, line variant)" />
        </div>
      </Section>

      <Section title="Toggle group, tabs, progress">
        <Row label="chips"><ToggleGroup type="single" defaultValue="all" aria-label="Platform"><ToggleGroupItem value="all">All</ToggleGroupItem><ToggleGroupItem value="ig">Instagram</ToggleGroupItem><ToggleGroupItem value="li">LinkedIn</ToggleGroupItem></ToggleGroup></Row>
        <Row label="pill"><ToggleGroup type="single" variant="pill" value={view} onValueChange={setView} aria-label="Range"><ToggleGroupItem value="day">Day</ToggleGroupItem><ToggleGroupItem value="week">Week</ToggleGroupItem><ToggleGroupItem value="month">Month</ToggleGroupItem></ToggleGroup></Row>
        <Row label="multiple"><ToggleGroup type="multiple" aria-label="Accounts"><ToggleGroupItem value="a">@posthive</ToggleGroupItem><ToggleGroupItem value="b">@team</ToggleGroupItem></ToggleGroup></Row>
        <div className="grid gap-6 md:grid-cols-2">
          <Tabs defaultValue="content"><TabsList aria-label="Pill tabs"><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="platforms">Platforms</TabsTrigger></TabsList><TabsContent value="content" className="type-body-r-s text-muted">Caption text</TabsContent><TabsContent value="platforms" className="type-body-r-s text-muted">Platform options</TabsContent></Tabs>
          <Tabs defaultValue="content"><TabsList variant="line" aria-label="Line tabs"><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="platforms">Platforms</TabsTrigger></TabsList><TabsContent value="content" className="type-body-r-s text-muted">Caption text</TabsContent><TabsContent value="platforms" className="type-body-r-s text-muted">Platform options</TabsContent></Tabs>
        </div>
        <Row label="progress"><Progress value={60} className="max-w-60" /><Progress value={95} className="max-w-60" indicatorClassName="bg-red-500" /></Row>
        <Row label="skeleton"><Skeleton className="h-4 w-40" /><Skeleton className="size-10 rounded-full" /></Row>
      </Section>

      <Section title="Avatar, card, table, collapsible">
        <Row label="avatar">
          <Avatar size="sm"><AvatarFallback>P</AvatarFallback></Avatar>
          <Avatar><AvatarFallback>PA</AvatarFallback><AvatarBadge /></Avatar>
          <Avatar size="lg"><AvatarFallback>RB</AvatarFallback></Avatar>
          <AvatarGroup><Avatar><AvatarFallback>A</AvatarFallback></Avatar><Avatar><AvatarFallback>B</AvatarFallback></Avatar></AvatarGroup>
        </Row>
        <Card className="max-w-sm"><CardHeader><CardTitle>Plan Marketing</CardTitle><CardDescription>0 / 60 posts planned</CardDescription></CardHeader><CardContent><Progress value={0} /></CardContent></Card>
        <Table>
          <TableHeader><TableRow><TableHead>Post</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Launch teaser</TableCell><TableCell><Badge variant="success">Published</Badge></TableCell></TableRow>
            <TableRow><TableCell>Weekly tips</TableCell><TableCell><Badge variant="warning">In review</Badge></TableCell></TableRow>
          </TableBody>
        </Table>
        <Collapsible><CollapsibleTrigger asChild><Button variant="secondary" size="sm">Feedback thread</Button></CollapsibleTrigger><CollapsibleContent className="mt-2 type-body-r-s text-muted">Replies show here.</CollapsibleContent></Collapsible>
        <Separator />
      </Section>

      <Section title="Overlays" note="Open each one: Esc closes, Tab stays inside, focus returns to the button.">
        <Row label="dialog">
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit post</DialogTitle><DialogDescription>Change the text, then save.</DialogDescription></DialogHeader>
              <Textarea rows={3} aria-label="Caption" />
              <Popover>
                <PopoverTrigger asChild><Button variant="secondary" className="justify-start">Pick a date (popover inside a dialog)</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={day} onSelect={setDay} /></PopoverContent>
              </Popover>
              <DialogFooter><Button>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive-outline">Alert dialog</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <div className="flex items-start gap-4">
                <AlertDialogMedia className="border-red-200 bg-red-50 text-red-600"><Trash2Icon /></AlertDialogMedia>
                <AlertDialogHeader><AlertDialogTitle>Delete this post?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the scheduled post. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              </div>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive">Delete post</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Sheet>
            <SheetTrigger asChild><Button variant="secondary">Sheet (left)</Button></SheetTrigger>
            <SheetContent side="left"><SheetHeader><SheetTitle>Navigation</SheetTitle><SheetDescription>The mobile sidebar drawer.</SheetDescription></SheetHeader></SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild><Button variant="secondary">Sheet (bottom)</Button></SheetTrigger>
            <SheetContent side="bottom"><SheetHeader><SheetTitle>Preview</SheetTitle><SheetDescription>The mobile preview sheet.</SheetDescription></SheetHeader></SheetContent>
          </Sheet>
        </Row>
        <Row label="menus">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="secondary">Menu</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem>Rewrite</DropdownMenuItem>
              <DropdownMenuItem>Shorten</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive"><Trash2Icon /> Clear</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="secondary" aria-label="Delete post"><Trash2Icon /></Button></TooltipTrigger><TooltipContent>Delete post</TooltipContent></Tooltip>
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild><Button variant="secondary" role="combobox" aria-label="Timezone search" aria-expanded={comboOpen} className="w-56 justify-between">{zone}<ChevronsUpDownIcon className="text-muted" /></Button></PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone" />
                <CommandList>
                  <CommandEmpty>No timezone found</CommandEmpty>
                  {TIMEZONES.map((z) => <CommandItem key={z} value={z} onSelect={() => { setZone(z); setComboOpen(false); }}>{z}{z === zone && <CheckIcon className="ml-auto" />}</CommandItem>)}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Row>
        <Row label="calendar"><Calendar mode="single" selected={day} onSelect={setDay} className="rounded-2xl border border-border" /></Row>
      </Section>
    </div>
  );
}
