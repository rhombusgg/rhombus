import { Dialog as DialogPrimitive } from "@kobalte/core";
import { type DialogOverlayProps } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { Component, JSX, ParentComponent } from "solid-js";
import { cn } from "./utils.tsx";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.CloseButton;

const DialogOverlay: ParentComponent<DialogOverlayProps> = (props) => (
  <DialogPrimitive.Overlay
    {...props}
    class={cn(
      "bg-background/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50",
      // @ts-ignore
      props.class,
    )}
  />
);

// @ts-ignore
const DialogContent: ParentComponent<DialogPrimitive.DialogContentProps> = (
  props,
) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      {...props}
      class={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 sm:rounded-lg",
        props.class,
      )}
    >
      {props.children}
      <DialogPrimitive.CloseButton class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none">
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </DialogPrimitive.CloseButton>
    </DialogPrimitive.Content>
  </DialogPortal>
);

const DialogHeader: Component<JSX.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div
    {...props}
    class={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      props.class,
    )}
  />
);

const DialogFooter: ParentComponent<JSX.HTMLAttributes<HTMLDivElement>> = (
  props,
) => (
  <div
    {...props}
    class={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      props.class,
    )}
  />
);

// @ts-ignore
const DialogTitle: ParentComponent<DialogPrimitive.DialogTitleProps> = (
  props,
) => (
  <DialogPrimitive.Title
    {...props}
    class={cn("text-lg font-semibold leading-none tracking-tight", props.class)}
  />
);

const DialogDescription: ParentComponent<
  // @ts-ignore
  DialogPrimitive.DialogDescriptionCommonProps
> = (props) => (
  <DialogPrimitive.Description
    {...props}
    class={cn("text-muted-foreground text-sm", props.class)}
    {...props}
  />
);

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
