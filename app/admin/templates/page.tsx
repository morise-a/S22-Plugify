import * as React from 'react';
import { getTemplatesAction } from '../../actions/templates';
import { TemplateBuilderClient } from '../../../components/admin/template-builder-client';

export const revalidate = 0; // Prevent caching to show live template changes

export default async function AdminTemplatesPage() {
  const templates = await getTemplatesAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mail Template Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose HTML transactional mailers, copy dynamic placeholders, and verify with live previews.
        </p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <TemplateBuilderClient initialTemplates={templates} />
      </div>
    </div>
  );
}
