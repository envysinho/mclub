"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

import { cn } from "@/lib/utils"

function Collapsible({
  ...props
}) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}) {
  return (<CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />);
}

function CollapsibleContent({
  className,
  ...props
}) {
  return (
    <CollapsiblePrimitive.Panel
      keepMounted
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up [--radix-collapsible-content-height:var(--collapsible-panel-height)]",
        className
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
