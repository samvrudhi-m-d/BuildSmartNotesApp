import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "Personal" | "College" | "Work" | "Ideas";
type View = "home" | "tasks" | "settings";

type Note = {
  id: string;
  title: string;
  description: string;
  category: Category;
  pinned: boolean;
  createdAt: string;
  modifiedAt: string;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  modifiedAt: string;
};

const categories: { name: Category; color: string; soft: string }[] = [
  { name: "Personal", color: "#EF8D70", soft: "#FFF0E9" },
  { name: "College", color: "#7088E8", soft: "#EEF0FF" },
  { name: "Work", color: "#47A785", soft: "#E8F7F1" },
  { name: "Ideas", color: "#B079D0", soft: "#F7EDFC" },
];

const seedNotes: Note[] = [
  {
    id: "welcome",
    title: "Welcome to Smart Notes",
    description:
      "Capture your thoughts, stay organized, and keep the important things close. Tap any note to edit it.",
    category: "Personal",
    pinned: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    modifiedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "project",
    title: "Project brainstorm",
    description:
      "Explore a calmer onboarding flow and collect visual references for the next review.",
    category: "Ideas",
    pinned: false,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    modifiedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "lecture",
    title: "Lecture notes",
    description: "Review chapter four and summarize the key concepts before Friday.",
    category: "College",
    pinned: false,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    modifiedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const seedTasks: Task[] = [
  {
    id: "task-one",
    title: "Plan the week ahead",
    completed: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    modifiedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "task-two",
    title: "Organize college notes",
    completed: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    modifiedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("smart-notes-db", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes", { keyPath: "id" });
      if (!db.objectStoreNames.contains("tasks")) db.createObjectStore("tasks", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readInitializationState() {
  const db = await openDatabase();
  return new Promise<boolean>((resolve, reject) => {
    const request = db.transaction("meta", "readonly").objectStore("meta").get("initialized");
    request.onsuccess = () => resolve(Boolean(request.result?.value));
    request.onerror = () => reject(request.error);
  });
}

async function markDatabaseInitialized() {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("meta", "readwrite");
    transaction.objectStore("meta").put({ key: "initialized", value: true });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function readStore<T>(storeName: "notes" | "tasks") {
  const db = await openDatabase();
  return new Promise<T[]>((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRecord(storeName: "notes" | "tasks", record: Note | Task) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteRecord(storeName: "notes" | "tasks", id: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function Icon({ name, size = 22, fill = "none" }: { name: string; size?: number; fill?: string }) {
  const paths: Record<string, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    tasks: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    pin: (
      <>
        <path d="m15 4 5 5-3 2-4 5-5-5 5-4Z" />
        <path d="m9 15-5 5" />
      </>
    ),
    moon: <path d="M20.5 15.4A8.8 8.8 0 0 1 8.6 3.5 9 9 0 1 0 20.5 15.4Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    back: <path d="m15 18-6-6 6-6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
      </>
    ),
    edit: (
      <>
        <path d="M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10Z" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function formatDate(date: string) {
  const value = new Date(date);
  const today = new Date();
  if (value.toDateString() === today.toDateString()) {
    return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return value.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<View>("home");
  const [category, setCategory] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null | undefined>(undefined);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("smart-notes-theme") as "light" | "dark") || "light",
  );
  const [ready, setReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "note" | "task"; id: string } | null>(
    null,
  );

  useEffect(() => {
    Promise.all([readStore<Note>("notes"), readStore<Task>("tasks"), readInitializationState()])
      .then(async ([savedNotes, savedTasks, initialized]) => {
        const nextNotes = !initialized && !savedNotes.length ? seedNotes : savedNotes;
        const nextTasks = !initialized && !savedTasks.length ? seedTasks : savedTasks;
        if (!initialized) {
          await Promise.all([
            ...nextNotes.map((note) => putRecord("notes", note)),
            ...nextTasks.map((task) => putRecord("tasks", task)),
          ]);
          await markDatabaseInitialized();
        }
        setNotes(nextNotes);
        setTasks(nextTasks);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("smart-notes-theme", theme);
  }, [theme]);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes
      .filter((note) => category === "All" || note.category === category)
      .filter(
        (note) =>
          !normalized ||
          note.title.toLowerCase().includes(normalized) ||
          note.description.toLowerCase().includes(normalized),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      );
  }, [notes, category, query]);

  async function saveNote(data: { title: string; description: string; category: Category }) {
    const now = new Date().toISOString();
    const record: Note = editingNote
      ? { ...editingNote, ...data, modifiedAt: now }
      : {
          ...data,
          id: crypto.randomUUID(),
          pinned: false,
          createdAt: now,
          modifiedAt: now,
        };
    setNotes((current) =>
      editingNote
        ? current.map((note) => (note.id === record.id ? record : note))
        : [record, ...current],
    );
    await putRecord("notes", record);
    setEditingNote(undefined);
  }

  async function togglePin(note: Note) {
    const record = { ...note, pinned: !note.pinned, modifiedAt: new Date().toISOString() };
    setNotes((current) => current.map((item) => (item.id === note.id ? record : item)));
    await putRecord("notes", record);
  }

  async function saveTask(title: string) {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: now,
      modifiedAt: now,
    };
    setTasks((current) => [task, ...current]);
    await putRecord("tasks", task);
    setTaskEditorOpen(false);
  }

  async function toggleTask(task: Task) {
    const record = { ...task, completed: !task.completed, modifiedAt: new Date().toISOString() };
    setTasks((current) => current.map((item) => (item.id === task.id ? record : item)));
    await putRecord("tasks", record);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "note") {
      setNotes((current) => current.filter((item) => item.id !== deleteTarget.id));
      await deleteRecord("notes", deleteTarget.id);
      setEditingNote(undefined);
    } else {
      setTasks((current) => current.filter((item) => item.id !== deleteTarget.id));
      await deleteRecord("tasks", deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <div className="app-shell">
      <main className="app-content">
        {view === "home" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">MY WORKSPACE</p>
                <h1>Smart Notes</h1>
              </div>
              <button
                className="icon-button theme-button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <Icon name={theme === "light" ? "moon" : "sun"} />
              </button>
            </header>

            <div className="search-field">
              <Icon name="search" size={20} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your notes"
                aria-label="Search notes"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search">
                  <Icon name="close" size={17} />
                </button>
              )}
            </div>

            <div className="category-scroll" aria-label="Filter notes by category">
              <button
                className={category === "All" ? "category-chip active" : "category-chip"}
                onClick={() => setCategory("All")}
              >
                All notes <span>{notes.length}</span>
              </button>
              {categories.map((item) => (
                <button
                  key={item.name}
                  className={category === item.name ? "category-chip active" : "category-chip"}
                  onClick={() => setCategory(item.name)}
                >
                  <i style={{ background: item.color }} /> {item.name}
                </button>
              ))}
            </div>

            <section className="section-heading">
              <div>
                <h2>{category === "All" ? "Recent notes" : category}</h2>
                <p>
                  {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                </p>
              </div>
            </section>

            {!ready ? (
              <div className="loading-grid">
                <i />
                <i />
                <i />
              </div>
            ) : filteredNotes.length ? (
              <div className="notes-grid">
                {filteredNotes.map((note) => {
                  const palette = categories.find((item) => item.name === note.category)!;
                  return (
                    <article
                      className="note-card"
                      style={
                        {
                          "--card-accent": palette.color,
                          "--card-soft": palette.soft,
                        } as React.CSSProperties
                      }
                      key={note.id}
                      onClick={() => setEditingNote(note)}
                    >
                      <div className="note-card-top">
                        <span className="note-category">
                          <i />
                          {note.category}
                        </span>
                        <button
                          className={note.pinned ? "pin-button pinned" : "pin-button"}
                          onClick={(event) => {
                            event.stopPropagation();
                            togglePin(note);
                          }}
                          aria-label={note.pinned ? "Unpin note" : "Pin note"}
                        >
                          <Icon name="pin" size={18} fill={note.pinned ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <h3>{note.title}</h3>
                      <p>{note.description || "No description yet."}</p>
                      <footer>
                        <span>
                          {note.modifiedAt !== note.createdAt ? "Edited " : ""}
                          {formatDate(note.modifiedAt)}
                        </span>
                        <span className="edit-hint">
                          <Icon name="edit" size={15} />
                        </span>
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div>
                  <Icon name="search" size={27} />
                </div>
                <h3>No notes found</h3>
                <p>Try a different search or create a new note.</p>
                <button onClick={() => setEditingNote(null)}>Create note</button>
              </div>
            )}
          </>
        )}

        {view === "tasks" && (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">STAY ON TRACK</p>
                <h1>To-do list</h1>
              </div>
              <button
                className="icon-button theme-button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                aria-label="Toggle theme"
              >
                <Icon name={theme === "light" ? "moon" : "sun"} />
              </button>
            </header>
            <div className="progress-card">
              <div className="progress-copy">
                <span>
                  {completedCount} of {tasks.length} completed
                </span>
                <strong>
                  {tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%
                </strong>
              </div>
              <div className="progress-track">
                <i
                  style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <section className="section-heading task-heading">
              <div>
                <h2>My tasks</h2>
                <p>{tasks.filter((task) => !task.completed).length} remaining</p>
              </div>
              {completedCount > 0 && (
                <button
                  className="text-button"
                  onClick={async () => {
                    const completed = tasks.filter((task) => task.completed);
                    setTasks((current) => current.filter((task) => !task.completed));
                    await Promise.all(completed.map((task) => deleteRecord("tasks", task.id)));
                  }}
                >
                  Clear completed
                </button>
              )}
            </section>
            <div className="task-list">
              {tasks
                .slice()
                .sort((a, b) => Number(a.completed) - Number(b.completed))
                .map((task) => (
                  <div className={task.completed ? "task-row completed" : "task-row"} key={task.id}>
                    <button
                      className="task-check"
                      onClick={() => toggleTask(task)}
                      aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {task.completed && <Icon name="check" size={16} />}
                    </button>
                    <button className="task-copy" onClick={() => toggleTask(task)}>
                      <span>{task.title}</span>
                      <small>
                        {task.completed ? "Completed" : `Added ${formatDate(task.createdAt)}`}
                      </small>
                    </button>
                    <button
                      className="task-delete"
                      onClick={() => setDeleteTarget({ type: "task", id: task.id })}
                      aria-label="Delete task"
                    >
                      <Icon name="trash" size={19} />
                    </button>
                  </div>
                ))}
              {!tasks.length && (
                <div className="empty-state">
                  <div>
                    <Icon name="check" size={27} />
                  </div>
                  <h3>All clear</h3>
                  <p>Add a task when something comes up.</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === "settings" && (
          <>
            <header className="topbar settings-title">
              <div>
                <p className="eyebrow">MAKE IT YOURS</p>
                <h1>Settings</h1>
              </div>
            </header>
            <section className="settings-card profile-card">
              <div className="profile-mark">SN</div>
              <div>
                <h2>Smart Notes</h2>
                <p>Your calm space for every thought.</p>
              </div>
            </section>
            <h3 className="settings-label">APPEARANCE</h3>
            <section className="settings-card">
              <button
                className="settings-row"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                <span className="settings-icon purple">
                  <Icon name={theme === "light" ? "moon" : "sun"} size={20} />
                </span>
                <span>
                  <strong>Color mode</strong>
                  <small>{theme === "light" ? "Light" : "Dark"} theme</small>
                </span>
                <div className={theme === "dark" ? "toggle on" : "toggle"}>
                  <i />
                </div>
              </button>
            </section>
            <h3 className="settings-label">STORAGE</h3>
            <section className="settings-card">
              <div className="settings-row">
                <span className="settings-icon green">
                  <Icon name="database" size={20} />
                </span>
                <span>
                  <strong>Offline database</strong>
                  <small>
                    {notes.length} notes and {tasks.length} tasks saved
                  </small>
                </span>
                <span className="status-dot" title="Database connected" />
              </div>
            </section>
            <p className="settings-footnote">
              Your notes are securely stored on this device and remain available after you close the
              app.
            </p>
          </>
        )}
      </main>

      {(view === "home" || view === "tasks") && (
        <button
          className="fab"
          onClick={() => (view === "home" ? setEditingNote(null) : setTaskEditorOpen(true))}
          aria-label={view === "home" ? "Create note" : "Add task"}
        >
          <Icon name="plus" size={25} />
          <span>{view === "home" ? "New note" : "Add task"}</span>
        </button>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
          <Icon name="home" />
          <span>Notes</span>
        </button>
        <button className={view === "tasks" ? "active" : ""} onClick={() => setView("tasks")}>
          <Icon name="tasks" />
          <span>Tasks</span>
        </button>
        <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
          <Icon name="settings" />
          <span>Settings</span>
        </button>
      </nav>

      {editingNote !== undefined && (
        <NoteEditor
          note={editingNote}
          onClose={() => setEditingNote(undefined)}
          onSave={saveNote}
          onDelete={
            editingNote ? () => setDeleteTarget({ type: "note", id: editingNote.id }) : undefined
          }
        />
      )}

      {taskEditorOpen && <TaskEditor onClose={() => setTaskEditorOpen(false)} onSave={saveTask} />}

      {deleteTarget && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setDeleteTarget(null)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="danger-icon">
              <Icon name="trash" />
            </div>
            <h2>Delete {deleteTarget.type}?</h2>
            <p>This can’t be undone. The {deleteTarget.type} will be removed from your database.</p>
            <div>
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="danger-button" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  note,
  onClose,
  onSave,
  onDelete,
}: {
  note: Note | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; category: Category }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [description, setDescription] = useState(note?.description ?? "");
  const [category, setCategory] = useState<Category>(note?.category ?? "Personal");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), category });
  }

  return (
    <div className="editor-screen">
      <form onSubmit={submit}>
        <header className="editor-header">
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close editor">
            <Icon name="back" />
          </button>
          <h2>{note ? "Edit note" : "New note"}</h2>
          <button className="save-button" disabled={!title.trim()}>
            Save
          </button>
        </header>
        <div className="editor-body">
          <label className="field-label" htmlFor="note-title">
            TITLE
          </label>
          <input
            id="note-title"
            className="title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your note a title"
            autoFocus
          />
          <label className="field-label category-label">CATEGORY</label>
          <div className="editor-categories">
            {categories.map((item) => (
              <button
                type="button"
                key={item.name}
                className={category === item.name ? "editor-category selected" : "editor-category"}
                style={
                  { "--chip-color": item.color, "--chip-soft": item.soft } as React.CSSProperties
                }
                onClick={() => setCategory(item.name)}
              >
                <i />
                {item.name}
              </button>
            ))}
          </div>
          <label className="field-label description-label" htmlFor="note-description">
            NOTE
          </label>
          <textarea
            id="note-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Write down what's on your mind..."
          />
          {note && (
            <div className="date-details">
              <span>
                Created{" "}
                {new Date(note.createdAt).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>Last edited {formatDate(note.modifiedAt)}</span>
            </div>
          )}
          {onDelete && (
            <button type="button" className="delete-note-button" onClick={onDelete}>
              <Icon name="trash" size={19} /> Delete note
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function TaskEditor({ onClose, onSave }: { onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="task-editor"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) onSave(title.trim());
        }}
      >
        <div className="sheet-handle" />
        <div className="task-editor-heading">
          <div>
            <p className="eyebrow">QUICK ADD</p>
            <h2>New task</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <label className="field-label" htmlFor="task-title">
          WHAT NEEDS TO BE DONE?
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Review meeting notes"
          autoFocus
        />
        <button className="primary-button" disabled={!title.trim()}>
          <Icon name="plus" size={20} /> Add task
        </button>
      </form>
    </div>
  );
}
