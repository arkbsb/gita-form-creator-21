import { useState, useEffect } from "react";
import { Folder, Plus, Edit, Trash2, ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  form_count?: number;
}

interface FolderSidebarProps {
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderUpdate: () => void;
  formCounts: Record<string, number>;
}

export function FolderSidebar({ selectedFolderId, onFolderSelect, onFolderUpdate, formCounts }: FolderSidebarProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.user.id)
        .order("order_index");

      if (error) throw error;
      
      setFolders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pastas:", error);
      toast.error("Erro ao carregar pastas");
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from("folders")
        .insert({
          name: newFolderName.trim(),
          user_id: user.user.id,
          order_index: folders.length
        });

      if (error) throw error;

      setNewFolderName("");
      setIsCreateDialogOpen(false);
      fetchFolders();
      onFolderUpdate();
      toast.success("Pasta criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  const updateFolder = async () => {
    if (!editingFolder || !editingFolder.name.trim()) return;

    try {
      const { error } = await supabase
        .from("folders")
        .update({ name: editingFolder.name.trim() })
        .eq("id", editingFolder.id);

      if (error) throw error;

      setEditingFolder(null);
      setIsEditDialogOpen(false);
      fetchFolders();
      toast.success("Pasta renomeada com sucesso!");
    } catch (error) {
      console.error("Erro ao renomear pasta:", error);
      toast.error("Erro ao renomear pasta");
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      // Primeiro, move todos os formulários da pasta para a raiz
      const { error: moveError } = await supabase
        .from("forms")
        .update({ folder_id: null })
        .eq("folder_id", folderId);

      if (moveError) throw moveError;

      // Depois, deleta a pasta
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      // Se a pasta deletada estava selecionada, volta para "Todos os Formulários"
      if (selectedFolderId === folderId) {
        onFolderSelect(null);
      }

      fetchFolders();
      onFolderUpdate();
      toast.success("Pasta deletada e formulários movidos para a raiz");
    } catch (error) {
      console.error("Erro ao deletar pasta:", error);
      toast.error("Erro ao deletar pasta");
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(folders);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar order_index localmente
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index
    }));

    setFolders(updatedItems);

    // Atualizar no banco
    try {
      const updates = updatedItems.map((folder, index) => ({
        id: folder.id,
        order_index: index
      }));

      for (const update of updates) {
        await supabase
          .from("folders")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Erro ao reordenar pastas:", error);
      toast.error("Erro ao reordenar pastas");
      fetchFolders(); // Reverter mudanças
    }
  };

  const rootFormCount = formCounts['root'] || 0;

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Organização</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Pasta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome da pasta"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createFolder}>Criar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Todos os Formulários */}
        <button
          onClick={() => onFolderSelect(null)}
          className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
            selectedFolderId === null 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-muted"
          }`}
        >
          <div className="flex items-center space-x-2">
            <Folder className="h-4 w-4" />
            <span className="text-sm">Todos os Formulários</span>
          </div>
          <span className="text-xs bg-muted-foreground/20 px-2 py-1 rounded">
            {rootFormCount}
          </span>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="folders">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {folders.map((folder, index) => (
                    <Draggable key={folder.id} draggableId={folder.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group mb-1 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <div
                            className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                              selectedFolderId === folder.id 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-muted"
                            }`}
                          >
                            <button
                              onClick={() => onFolderSelect(folder.id)}
                              className="flex items-center space-x-2 flex-1 text-left"
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <Folder className="h-4 w-4" />
                              </div>
                              <span className="text-sm truncate">{folder.name}</span>
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              <span className="text-xs bg-muted-foreground/20 px-2 py-1 rounded">
                                {formCounts[folder.id] || 0}
                              </span>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setEditingFolder({ id: folder.id, name: folder.name });
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Renomear
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deleteFolder(folder.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </ScrollArea>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da pasta"
              value={editingFolder?.name || ""}
              onChange={(e) => setEditingFolder(prev => prev ? { ...prev, name: e.target.value } : null)}
              onKeyDown={(e) => e.key === "Enter" && updateFolder()}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateFolder}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}