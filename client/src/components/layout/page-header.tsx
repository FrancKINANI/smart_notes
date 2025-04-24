import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  backLinkLabel?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  backLink,
  backLinkLabel,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 mb-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {backLink && (
          <Link href={backLink}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">{backLinkLabel || "Retour"}</span>
            </Button>
          </Link>
        )}
        
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="mt-2 sm:mt-0 flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}