<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { notesApi } from '@/api'
import { marked } from 'marked'

interface Note {
  id: number
  title: string
  content: string
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

const notes = ref<Note[]>([])
const selectedNoteId = ref<number | null>(null)
const isCreating = ref(false)
const searchQuery = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)

// 自定义弹窗状态
const confirmDialog = ref({ show: false, title: '', message: '', resolve: null as ((val: boolean) => void) | null })

function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise(resolve => {
    confirmDialog.value = { show: true, title, message, resolve }
  })
}

function onConfirmOk() {
  const r = confirmDialog.value.resolve
  confirmDialog.value = { show: false, title: '', message: '', resolve: null }
  if (r) r(true)
}

function onConfirmCancel() {
  const r = confirmDialog.value.resolve
  confirmDialog.value = { show: false, title: '', message: '', resolve: null }
  if (r) r(false)
}

const editTitle = ref('')
const editContent = ref('')
const editIsPublic = ref(false)
const hasChanges = ref(false)

const filteredNotes = computed(() => {
  if (!searchQuery.value.trim()) return notes.value
  const q = searchQuery.value.toLowerCase()
  return notes.value.filter(
    (n) =>
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q)
  )
})

const selectedNote = computed(() => {
  return notes.value.find((n) => n.id === selectedNoteId.value) || null
})

const renderedHtml = computed(() => {
  try {
    return marked(editContent.value || '')
  } catch {
    return editContent.value
  }
})

const showEditor = computed(() => isCreating.value || selectedNote.value)

async function fetchNotes() {
  loading.value = true
  error.value = ''
  try {
    const res = await notesApi.getAll()
    const d = res.data || {}
    if (Array.isArray(d)) {
      notes.value = d
    } else if (Array.isArray(d.notes)) {
      notes.value = d.notes
    } else if (Array.isArray(d.data)) {
      notes.value = d.data
    } else {
      notes.value = []
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '加载笔记失败'
  } finally {
    loading.value = false
  }
}

async function selectNote(note: Note) {
  if (hasChanges.value) {
    const ok = await showConfirm('未保存的更改', '有未保存的更改，确定要切换吗？')
    if (!ok) return
  }
  isCreating.value = false
  selectedNoteId.value = note.id
  editTitle.value = note.title || ''
  editContent.value = note.content || ''
  editIsPublic.value = note.isPublic || false
  hasChanges.value = false
}

async function createNote() {
  if (hasChanges.value) {
    const ok = await showConfirm('未保存的更改', '有未保存的更改，确定要创建新笔记吗？')
    if (!ok) return
  }
  isCreating.value = true
  selectedNoteId.value = null
  editTitle.value = ''
  editContent.value = ''
  editIsPublic.value = false
  hasChanges.value = false
}

async function saveNote() {
  if (!editTitle.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    if (selectedNoteId.value) {
      await notesApi.update(selectedNoteId.value, {
        title: editTitle.value,
        content: editContent.value,
        isPublic: editIsPublic.value,
      })
    } else {
      const res = await notesApi.create({
        title: editTitle.value,
        content: editContent.value,
        isPublic: editIsPublic.value,
      })
      const respData = res.data
      const noteId = respData?.data?.id || respData?.id
      if (!noteId) {
        error.value = '保存失败：服务器未返回笔记ID'
        return
      }
      selectedNoteId.value = noteId
      isCreating.value = false
    }
    hasChanges.value = false
    await fetchNotes()
  } catch (err: any) {
    error.value = err?.response?.data?.message || err?.message || '保存笔记失败'
  } finally {
    saving.value = false
  }
}

async function deleteNote(id: number) {
  if (!confirm('确定要删除这篇笔记吗？')) return
  try {
    await notesApi.delete(id)
    if (selectedNoteId.value === id) {
      selectedNoteId.value = null
      isCreating.value = false
      editTitle.value = ''
      editContent.value = ''
    }
    await fetchNotes()
  } catch (err: any) {
    error.value = err?.response?.data?.message || '删除笔记失败'
  }
}

// === Markdown 工具栏 ===
function insertMarkdown(before: string, after: string) {
  const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = editContent.value.substring(start, end)
  const newText = editContent.value.substring(0, start) + before + selected + after + editContent.value.substring(end)
  editContent.value = newText
  hasChanges.value = true
  // Restore focus
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

function insertImage() {
  const url = prompt('请输入图片URL:')
  if (!url) return
  const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const alt = editContent.value.substring(start, end) || 'image'
  const md = `![${alt}](${url})`
  editContent.value = editContent.value.substring(0, start) + md + editContent.value.substring(end)
  hasChanges.value = true
  setTimeout(() => textarea.focus())
}

function insertLink() {
  const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = editContent.value.substring(start, end) || '链接文字'
  const md = `[${selected}](url)`
  editContent.value = editContent.value.substring(0, start) + md + editContent.value.substring(end)
  hasChanges.value = true
  setTimeout(() => textarea.focus())
}

watch([editTitle, editContent], () => {
  if (selectedNote.value || isCreating.value) {
    hasChanges.value = true
  }
})

// 离开时提示未保存
onBeforeRouteLeave(async (_to, _from, next) => {
  if (hasChanges.value) {
    const ok = await showConfirm('未保存的更改', '有未保存的更改，确定要离开吗？')
    if (!ok) {
      next(false)
      return
    }
  }
  next()
})

// Ctrl+S 保存
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveNote()
  }
}

onMounted(() => {
  fetchNotes()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="page-container notes-page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div v-else-if="error" class="error-message">
      <span>⚠️ {{ error }}</span>
      <button class="btn btn-sm btn-secondary" @click="fetchNotes">重试</button>
    </div>

    <template v-else>
      <div class="notes-layout">
        <!-- Left: Note List -->
        <div class="notes-sidebar">
          <div class="notes-toolbar">
            <input
              v-model="searchQuery"
              class="input"
              placeholder="搜索笔记..."
            />
            <button class="btn btn-primary btn-sm" @click="createNote">
              ✏️ 新建
            </button>
          </div>

          <div
            v-if="filteredNotes.length === 0"
            class="empty-state"
            style="padding: 32px"
          >
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">
              {{ searchQuery ? '没有找到匹配的笔记' : '还没有笔记' }}
            </div>
            <div class="empty-state-desc">点击「新建」按钮创建笔记</div>
          </div>

          <div v-else class="notes-list">
            <div
              v-for="note in filteredNotes"
              :key="note.id"
              class="note-item card"
              :class="{ active: note.id === selectedNoteId }"
              @click="selectNote(note)"
            >
              <div class="note-item-header">
                <span class="note-item-title">{{ note.title || '无标题' }}</span>
                <button
                  class="btn-delete"
                  @click.stop="deleteNote(note.id)"
                  title="删除"
                >
                  ✕
                </button>
              </div>
              <div class="note-item-summary">
                {{ note.content?.substring(0, 60) || '暂无内容' }}{{ note.content?.length > 60 ? '...' : '' }}
              </div>
              <div class="note-item-meta">
                <span>{{ new Date(note.updatedAt || note.createdAt).toLocaleDateString('zh-CN') }}</span>
                <span v-if="note.isPublic" class="badge badge-accent">公开</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Editor -->
        <div class="notes-editor">
          <div v-if="!showEditor" class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">选择一篇笔记或点击「新建」创建笔记</div>
          </div>
          <div v-else class="editor-container">
            <div class="editor-toolbar">
              <input
                v-model="editTitle"
                class="input editor-title-input"
                placeholder="笔记标题"
              />
              <div class="editor-actions">
                <label class="public-toggle">
                  <input type="checkbox" v-model="editIsPublic" />
                  <span>公开</span>
                </label>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="!editTitle.trim() || saving"
                  @click="saveNote"
                >
                  {{ saving ? '保存中...' : '💾 保存' }}
                </button>
              </div>
            </div>

            <!-- Markdown 工具栏 -->
            <div class="md-toolbar" v-if="showEditor">
              <button class="md-btn" @click="insertMarkdown('**', '**')" title="加粗"><b>B</b></button>
              <button class="md-btn" @click="insertMarkdown('*', '*')" title="斜体"><i>I</i></button>
              <button class="md-btn" @click="insertMarkdown('~~', '~~')" title="删除线"><s>S</s></button>
              <span class="md-sep"></span>
              <button class="md-btn" @click="insertMarkdown('- ', '')" title="无序列表">• 列表</button>
              <button class="md-btn" @click="insertMarkdown('1. ', '')" title="有序列表">1. 列表</button>
              <span class="md-sep"></span>
              <button class="md-btn" @click="insertMarkdown('# ', '')" title="标题1">H1</button>
              <button class="md-btn" @click="insertMarkdown('## ', '')" title="标题2">H2</button>
              <button class="md-btn" @click="insertMarkdown('### ', '')" title="标题3">H3</button>
              <span class="md-sep"></span>
              <button class="md-btn" @click="insertLink()" title="插入链接">🔗</button>
              <button class="md-btn" @click="insertImage()" title="插入图片">🖼️</button>
              <button class="md-btn" @click="insertMarkdown('> ', '')" title="引用">❝ 引用</button>
              <button class="md-btn" @click="insertMarkdown('```\n', '\n```')" title="代码块">💻 代码</button>
            </div>

            <div class="editor-body">
              <textarea
                v-model="editContent"
                class="textarea editor-textarea"
                placeholder="使用 Markdown 编写笔记..."
              ></textarea>
              <div class="editor-preview markdown-preview" v-html="renderedHtml"></div>
            </div>

            <div class="editor-status">
              <span v-if="hasChanges" class="unsaved">● 未保存</span>
              <span v-else class="saved">已保存</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 自定义确认弹窗 -->
  <div v-if="confirmDialog.show" class="modal-overlay" @click.self="onConfirmCancel">
    <div class="modal-content" style="max-width: 400px">
      <div class="modal-header">
        <h2 class="modal-title">{{ confirmDialog.title }}</h2>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); line-height: 1.6;">{{ confirmDialog.message }}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="onConfirmCancel">取消</button>
        <button class="btn btn-primary" @click="onConfirmOk">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.notes-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.notes-sidebar {
  width: 300px;
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.notes-toolbar {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.notes-toolbar .input {
  flex: 1;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.note-item {
  cursor: pointer;
  margin-bottom: 4px;
  padding: 12px;
  transition: all var(--transition);
}

.note-item:hover {
  background: var(--bg-hover);
}

.note-item.active {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.note-item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: all var(--transition);
}

.note-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

.note-item-summary {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-item-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Editor */
.notes-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-primary);
  flex-wrap: wrap;
}

.editor-title-input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  border: none;
  background: transparent;
  padding: 4px 0;
}

.editor-title-input:focus {
  box-shadow: none;
  border-bottom: 2px solid var(--accent);
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.public-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

/* Markdown Toolbar */
.md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  flex-wrap: wrap;
}

.md-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all var(--transition);
  font-family: inherit;
}

.md-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.md-sep {
  width: 1px;
  height: 20px;
  background: var(--border-primary);
  margin: 0 4px;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  border: none;
  border-radius: 0;
  resize: none;
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  min-height: auto;
}

.editor-textarea:focus {
  box-shadow: none;
}

.editor-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  border-left: 1px solid var(--border-primary);
}

/* Markdown preview images */
.editor-preview :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  margin: 8px 0;
}

.editor-preview :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.editor-preview :deep(a:hover) {
  text-decoration: underline;
}

.editor-status {
  padding: 8px 16px;
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
}

.unsaved {
  color: var(--warning);
}

.saved {
  color: var(--success);
}

@media (max-width: 768px) {
  .notes-layout {
    flex-direction: column;
  }

  .notes-sidebar {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
  }

  .editor-body {
    flex-direction: column;
  }

  .editor-preview {
    border-left: none;
    border-top: 1px solid var(--border-primary);
    max-height: 300px;
  }
}
</style>
