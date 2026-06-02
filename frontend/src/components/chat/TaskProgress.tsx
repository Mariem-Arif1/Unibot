"use client";

export type TaskStatus = "done" | "in-progress" | "pending" | "blocked";

export interface SubTask {
  title: string;
  status: TaskStatus;
}

export interface Task {
  title: string;
  status: TaskStatus;
  subtasks?: SubTask[];
}

function TaskIcon({ status, size = "md" }: { status: TaskStatus; size?: "md" | "sm" }) {
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  if (status === "done") {
    return (
      <div className={`${dim} rounded-full bg-green-500/15 border border-green-500/60 flex items-center justify-center flex-shrink-0`}>
        <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 10 10">
          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (status === "in-progress") {
    return (
      <div
        className={`${dim} rounded-full border-2 border-dashed border-[#4da5fc] flex-shrink-0 animate-spin`}
        style={{ animationDuration: "2s" }}
      />
    );
  }

  if (status === "blocked") {
    return (
      <div className={`${dim} rounded-full border border-yellow-500/50 bg-yellow-500/10 flex items-center justify-center flex-shrink-0`}>
        <span className="text-yellow-400 font-bold leading-none" style={{ fontSize: size === "sm" ? 8 : 10 }}>!</span>
      </div>
    );
  }

  // pending
  return (
    <div className={`${dim} rounded-full border border-white/20 flex-shrink-0`} />
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === "done") return null;

  const styles: Record<Exclude<TaskStatus, "done">, string> = {
    "in-progress": "text-[#4da5fc] border-[#4da5fc]/40 bg-[#4da5fc]/10",
    pending: "text-[#5a5a5f] border-white/10 bg-white/[0.04]",
    blocked: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function TaskProgress({ tasks }: { tasks: Task[] }) {
  return (
    <div className="mb-3 space-y-1.5">
      {tasks.map((task, i) => {
        // Collect indices of non-done subtasks for the number pills
        const pendingIndices = (task.subtasks ?? [])
          .map((s, idx) => (s.status !== "done" ? idx + 1 : null))
          .filter((n): n is number => n !== null);

        return (
          <div
            key={i}
            className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
          >
            {/* Parent row */}
            <div className="flex items-center gap-2.5">
              <TaskIcon status={task.status} />
              <span
                className={`flex-1 text-sm font-medium leading-snug ${
                  task.status === "done"
                    ? "line-through text-white/35"
                    : "text-white"
                }`}
              >
                {task.title}
              </span>

              {/* Number pills + status badge */}
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                {pendingIndices.length > 0 && (
                  <div className="flex gap-1">
                    {pendingIndices.map((n) => (
                      <span
                        key={n}
                        className="w-5 h-5 rounded bg-white/[0.07] text-[#5a5a5f] text-[10px] flex items-center justify-center font-medium"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                )}
                <StatusBadge status={task.status} />
              </div>
            </div>

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="ml-[9px] mt-2 pl-4 border-l-2 border-dashed border-white/[0.08] space-y-1.5">
                {task.subtasks.map((sub, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <TaskIcon status={sub.status} size="sm" />
                    <span
                      className={`text-xs leading-snug ${
                        sub.status === "done"
                          ? "line-through text-white/30"
                          : "text-white/55"
                      }`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
