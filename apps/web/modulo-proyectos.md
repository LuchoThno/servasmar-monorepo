Construye un módulo de gestión de proyectos con tareas en React + TypeScript + Tailwind CSS.

## COMPONENTES PRINCIPALES

### ProjectModule (componente raíz)
- Sidebar izquierdo fijo (220px): logo, búsqueda, navegación general, lista de proyectos, avatar de usuario
- Topbar: título dinámico, botón "Nueva tarea" (abre modal), filtros por vista
- Área principal: cambia según el proyecto/filtro activo

### ProjectCard
Props: id, name, color, icon, status, pct, total, done, overdue, desc
Muestra: ícono coloreado, nombre, badge de estado, 4 KPIs en grid, barra de progreso animada.

### TaskList
Props: tasks[], projectId?, filter?
Agrupa tareas por proyecto si no hay filtro activo.
Cada grupo tiene header con ícono/nombre del proyecto y botón "+ Agregar tarea".

### TaskCard
Props: task (id, name, priority, status, tag, tagColor, date, assignees[], subtasks[])
- Borde izquierdo de 3px coloreado según prioridad (rojo=alta, naranja=media, verde=baja)
- Checkbox animado al completar
- Nombre tachado cuando está done
- Chips: tag de categoría, contador subtareas (N/total), fecha, avatares de asignados
- Botones de acción visibles solo en hover: Ver detalle, Eliminar

### DetailPanel (drawer lateral derecho)
Se abre al hacer click en una tarea. Contiene:
- Título editable
- Textarea de descripción
- Chips de atributos: prioridad, fecha, proyecto (clickeables para editar)
- Lista de subtareas con checkboxes individuales + botón agregar subtarea
- Sección de adjuntos: listar archivos existentes + zona de upload (drag & drop)
- Feed de actividad (log inmutable de cambios)
- Footer: Cancelar + Guardar cambios

## TIPOS TypeScript

interface Project {
  id: string; name: string; color: string; icon: string;
  status: string; pct: number; total: number; done: number;
  overdue: number; desc: string;
}

interface Task {
  id: string; proj: string; name: string;
  priority: 'high' | 'medium' | 'low';
  status: 'done' | 'inprogress' | 'pending';
  tag: string; tagColor: string; date: string;
  assignees: string[];
  desc: string;
  subtasks: { text: string; done: boolean }[];
  attachments: { name: string; size: string; url: string }[];
  activity: string[];
}

## LÓGICA DE FILTRADO

type FilterType = 'all' | 'pending' | 'inprogress' | 'done'

Filtros combinables: por estado (tabs) + por proyecto (select).
Al cambiar filtro actualizar URL params: ?proj=p1&filter=inprogress

## GESTIÓN DE ESTADO (Zustand)

useProjectStore:
  projects: Project[]
  tasks: Task[]
  currentFilter: FilterType
  currentProject: string | 'all'
  activeTask: Task | null
  addTask(task): void
  updateTask(id, partial): void
  deleteTask(id): void
  toggleTask(id): void
  toggleSubtask(taskId, subtaskIdx): void
  addSubtask(taskId, text): void
  setFilter(f): void
  setProject(id): void
  openDetail(task): void
  closeDetail(): void

## INTERACCIONES REQUERIDAS

1. Click en sidebar de proyecto → filtra tareas, muestra ProjectCard con KPIs
2. Click en tarea → abre DetailPanel con toda la info editable
3. Click en checkbox → toggle done/inprogress, animación suave, re-render
4. "+ Agregar tarea" → modal con campos: nombre, proyecto, prioridad, fecha, asignados
5. Guardar en detail → actualiza store + agrega entrada al activity log
6. Drag & drop en adjuntos → simular upload con progress bar

## ESTILO VISUAL

- Sin colores hardcodeados: usar CSS variables del sistema (--color-background-primary, etc.)
- Sidebar: fondo --color-background-secondary, items activos con borde izquierdo 2.5px
- Cards: borde 0.5px solid var(--color-border-tertiary), radius 10px
- Prioridades: rojo #E24B4A alta, naranja #BA7517 media, verde #3B6D11 baja
- Tags coloreados: purple/green/amber/coral/blue/gray con fondo semitransparente
- Avatares: círculos de 18px con iniciales, colores fijos por usuario
- Hover en task cards: mostrar botones de acción con opacity transition
- Toasts: esquina inferior derecha, auto-dismiss 2.5s, ícono check verde

## NOTAS DE IMPLEMENTACIÓN

- Lazy load del DetailPanel (solo render cuando activeTask !== null)
- Memoizar TaskCard con React.memo para no re-renderizar la lista completa
- El activity log es inmutable: solo se puede agregar, nunca editar ni borrar
- Fecha formateada con date-fns: format(parseISO(date), 'd MMM', { locale: es })
- Responsive: sidebar colapsable en < 768px (hamburger)

Genera los archivos en este orden:
1. types/project.types.ts
2. store/projectStore.ts
3. components/ui/TaskCard.tsx
4. components/ui/DetailPanel.tsx
5. components/ui/ProjectCard.tsx
6. components/ProjectModule.tsx (raíz)
7. Datos de prueba en data/seed.ts con 3 proyectos y 8+ tareas realistas