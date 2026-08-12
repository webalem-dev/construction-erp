import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  getPriorityColor,
  formatEnum,
} from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { ProjectFormDialog } from './ProjectFormDialog'
import { TaskFormDialog } from './TaskFormDialog'

interface Project {
  id: string
  code: string
  name: string
  description: string | null
  client_name: string
  client_contact: string | null
  client_email: string | null
  status: string
  priority: string
  category: string | null
  start_date: string
  expected_end_date: string
  actual_end_date: string | null
  address: string | null
  city: string | null
  estimated_budget: number
  actual_cost: number
  manager: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  progress: number
  due_date: string | null
  assignee: {
    first_name: string
    last_name: string
  } | null
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (id) {
      fetchProject()
      fetchTasks()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          manager:employees!manager_id (id, first_name, last_name)
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      setProject(data as any)
    } catch (error: any) {
      toast.error('Failed to load project')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:employees!assignee_id (first_name, last_name)
      `)
      .eq('project_id', id!)
      .order('created_at')

    if (!error) setTasks((data as any) || [])
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id!)

      if (error) throw error
      toast.success('Project deleted successfully')
      navigate('/projects')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project')
    }
  }

  const handleEditTask = (taskId: string) => {
    setEditingTaskId(taskId)
    setTaskFormOpen(true)
  }

  const handleAddTask = () => {
    setEditingTaskId(undefined)
    setTaskFormOpen(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
      toast.success('Task deleted')
      fetchTasks()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete task')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!project) return null

  const budgetUsed = (Number(project.actual_cost) / Number(project.estimated_budget)) * 100
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
  const overallProgress = tasks.length > 0
    ? tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length
    : 0

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => navigate('/projects')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{project.code}</Badge>
                <Badge className={getStatusColor(project.status)}>
                  {formatEnum(project.status)}
                </Badge>
                <Badge className={getPriorityColor(project.priority)}>
                  {project.priority}
                </Badge>
                {project.category && (
                  <Badge variant="secondary">{project.category}</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="text-slate-600 mt-2">{project.description}</p>
              )}
            </div>

            {/* Edit + Delete buttons */}
            <div className="flex gap-2">
              <PermissionGate module="projects" action="edit">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </PermissionGate>

              <PermissionGate module="projects" action="delete">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{project.name}" and all its
                        tasks. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Project
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGate>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Overall Progress</p>
            <p className="text-3xl font-bold mt-2">{overallProgress.toFixed(0)}%</p>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Tasks</p>
            <p className="text-3xl font-bold mt-2">
              {completedTasks}<span className="text-slate-400">/{tasks.length}</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {tasks.length - completedTasks} remaining
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Budget Used</p>
            <p className="text-3xl font-bold mt-2">{budgetUsed.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-2">
              {formatCurrency(Number(project.actual_cost))} / {formatCurrency(Number(project.estimated_budget))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Due Date</p>
            <p className="text-lg font-bold mt-2">
              {formatDate(project.expected_end_date)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Started {formatDate(project.start_date)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tasks */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <Button size="sm" onClick={handleAddTask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600">No tasks yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-slate-600 mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.assignee.first_name} {task.assignee.last_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(task.status)}>
                            {formatEnum(task.status)}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-2">
                            {task.progress}% done
                          </p>
                          <div className="flex gap-1 mt-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditTask(task.id)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                        <div
                          className={`h-1.5 rounded-full ${
                            task.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                {project.client_name}
              </div>
              {project.client_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {project.client_email}
                </div>
              )}
              {project.client_contact && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {project.client_contact}
                </div>
              )}
            </CardContent>
          </Card>

          {project.manager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  {project.manager.first_name} {project.manager.last_name}
                </div>
              </CardContent>
            </Card>
          )}

          {(project.address || project.city) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {project.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span>{project.address}</span>
                  </div>
                )}
                {project.city && (
                  <p className="text-slate-600 pl-6">{project.city}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={project.id}
        onSuccess={fetchProject}
      />

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        projectId={project.id}
        taskId={editingTaskId}
        onSuccess={fetchTasks}
      />
    </div>
  )
}