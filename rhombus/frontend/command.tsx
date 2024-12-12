import {
  Command as CommandPrimitive,
  CommandRootProps,
  CommandInputProps,
  CommandListProps,
  CommandEmptyProps,
  CommandGroupProps,
  CommandSeparatorProps,
  CommandItemProps,
} from "cmdk-solid";

import { cn } from "./utils.tsx";
import { Dialog, DialogContent } from "./dialog.tsx";
import { Component, JSX, ParentComponent } from "solid-js";
import { type DialogRootProps } from "@kobalte/core/dialog";
import { Search } from "lucide-solid";

const Command: ParentComponent<CommandRootProps> = (props) => (
  <CommandPrimitive
    {...props}
    class={cn(
      "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-lg",
      props.class,
    )}
  />
);

interface CommandDialogProps extends DialogRootProps {}

const CommandDialog: ParentComponent<CommandDialogProps> = (props) => {
  return (
    <Dialog {...props}>
      <DialogContent class="overflow-hidden">
        <Command class="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {props.children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput: Component<CommandInputProps> = (props) => (
  <div class="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      {...props}
      class={cn(
        "placeholder:text-muted-foreground flex h-10 w-full rounded-lg bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
        props.class,
      )}
    />
  </div>
);

const CommandList: ParentComponent<CommandListProps> = (props) => (
  <CommandPrimitive.List
    {...props}
    class={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", props.class)}
  />
);

const CommandEmpty: ParentComponent<CommandEmptyProps> = (props) => (
  <CommandPrimitive.Empty {...props} class="py-6 text-center text-sm" />
);

const CommandGroup: ParentComponent<CommandGroupProps> = (props) => (
  <CommandPrimitive.Group
    {...props}
    class={cn(
      "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
      props.class,
    )}
  />
);

const CommandSeparator: Component<CommandSeparatorProps> = (props) => (
  <CommandPrimitive.Separator
    {...props}
    class={cn("bg-border h-px", props.class)}
  />
);

const CommandItem: ParentComponent<CommandItemProps> = (props) => (
  <CommandPrimitive.Item
    {...props}
    class={cn(
      "aria-selected:bg-accent aria-selected:text-accent-foreground relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      props.class,
    )}
  />
);

const CommandShortcut: ParentComponent<JSX.HTMLAttributes<HTMLSpanElement>> = (
  props,
) => {
  return (
    <span
      {...props}
      class={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        props.class,
      )}
    />
  );
};

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
