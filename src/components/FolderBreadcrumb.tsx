import { ChevronRight, Home } from "lucide-react";

interface FolderBreadcrumbProps {
  selectedFolderName: string | null;
}

export function FolderBreadcrumb({ selectedFolderName }: FolderBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Home className="h-4 w-4" />
      <span>Home</span>
      
      {selectedFolderName && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{selectedFolderName}</span>
        </>
      )}
    </nav>
  );
}