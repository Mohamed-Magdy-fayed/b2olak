"use client";

import { H2, Lead } from "@workspace/ui/components/typography";

type EntityPageHeaderProps = {
  title: string;
  lead?: string;
};

/**
 * Presentational page header for entity admin pages.
 * Renders an H2 title and an optional Lead subtitle.
 *
 * Adaptation note: the atelier source resolved title/lead from a system
 * registry by slug. Here the caller supplies the strings directly.
 */
export function EntityPageHeader({ title, lead }: EntityPageHeaderProps) {
  return (
    <div className="space-y-1">
      <H2>{title}</H2>
      {lead ? <Lead>{lead}</Lead> : null}
    </div>
  );
}
