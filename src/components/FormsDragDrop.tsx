import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, BarChart3, Trash2, ExternalLink, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Form {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_published: boolean;
  created_at: string;
  folder_id: string | null;
  webhook_url: string | null;
}

interface FormsDragDropProps {
  forms: Form[];
  onEditForm: (formId: string) => void;
  onViewAnalytics: (formId: string) => void;
  onDeleteForm: (formId: string) => void;
  onCopyLink: (slug: string) => void;
  selectedFolderId: string | null;
}

export function FormsDragDrop({ 
  forms, 
  onEditForm, 
  onViewAnalytics, 
  onDeleteForm, 
  onCopyLink,
  selectedFolderId 
}: FormsDragDropProps) {

  const filteredForms = forms.filter(form => {
    if (selectedFolderId === null) {
      return form.folder_id === null;
    }
    return form.folder_id === selectedFolderId;
  });

  if (filteredForms.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-sm">
          <div className="mb-4">
            <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold">Nenhum formulário encontrado</h3>
          <p className="text-muted-foreground mt-2">
            {selectedFolderId 
              ? "Esta pasta ainda não tem formulários. Arraste formulários aqui ou crie um novo."
              : "Você ainda não criou nenhum formulário. Comece criando seu primeiro formulário."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <Droppable droppableId="forms">
      {(provided, snapshot) => (
        <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 transition-colors ${
            snapshot.isDraggingOver ? 'bg-muted/20 rounded-lg p-4' : ''
          }`}
        >
          {filteredForms.map((form, index) => (
            <Draggable key={form.id} draggableId={form.id} index={index}>
              {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`transition-transform ${
                      snapshot.isDragging ? 'rotate-2 scale-105 shadow-lg' : ''
                    }`}
                  >
                    <Card className="h-full cursor-grab active:cursor-grabbing">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base line-clamp-2">{form.title}</CardTitle>
                          {form.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {form.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditForm(form.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewAnalytics(form.id)}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Ver Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCopyLink(form.slug)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Copiar Link
                            </DropdownMenuItem>
                            {form.webhook_url && (() => {
                              try {
                                const webhookData = JSON.parse(form.webhook_url);
                                const spreadsheetId = webhookData?.sheets?.spreadsheetId;
                                if (spreadsheetId) {
                                  return (
                                    <DropdownMenuItem 
                                      onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank')}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Abrir Google Sheets
                                    </DropdownMenuItem>
                                  );
                                }
                              } catch (error) {
                                console.error('Erro ao parsear webhook_url:', error);
                              }
                              return null;
                            })()}
                            <DropdownMenuItem 
                              onClick={() => onDeleteForm(form.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant={form.is_published ? "default" : "secondary"}>
                            {form.is_published ? "Publicado" : "Rascunho"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(form.created_at), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}