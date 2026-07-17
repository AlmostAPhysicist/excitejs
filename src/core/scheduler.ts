// scheduler.ts

export type Task = () => void;

export interface Schedule {
    name: string;
    tasks: Set<Task>;
    auto_flush: boolean;
}

export interface Scheduler {
    // State
    schedules: Set<Schedule>;
    flush_scheduled: boolean;

    // Callables
    requestFlush(): void;
    getOrCreate(name: string, auto_flush?: boolean): Schedule;
    flush(schedule?: Schedule): void;
}

export function Scheduler(): Scheduler {

    const self: Scheduler = {
        schedules: new Set<Schedule>(),
        flush_scheduled: false,

        requestFlush() {
            if (self.flush_scheduled) return;

            self.flush_scheduled = true;
            queueMicrotask(() => {
                self.flush_scheduled = false;
                self.flush();
            });
        },

        getOrCreate(name: string, auto_flush = true): Schedule {
            // Check for existing schedule
            for (const s of self.schedules) if (s.name === name) return s;

            const tasks = new Set<Task>();
            const originalAdd = tasks.add.bind(tasks);

            const schedule: Schedule = {
                name,
                tasks,
                auto_flush
            };

            // Intercept add() using the live flag
            tasks.add = (task: Task) => {
                originalAdd(task);
                if (schedule.auto_flush) {
                    self.requestFlush();
                }
                return tasks;
            };

            self.schedules.add(schedule);
            return schedule;
        },

        flush(schedule?: Schedule) {
            // Case 1: Targeted Execution
            if (schedule) {
                if (!self.schedules.has(schedule) || schedule.tasks.size === 0) return;

                const tasks = [...schedule.tasks];
                schedule.tasks.clear();
                for (const t of tasks) t();
                return;
            }

            // Case 2: Global Execution Pipeline
            for (const s of self.schedules) {
                if (s.tasks.size === 0) continue;

                const tasks = [...s.tasks];
                s.tasks.clear();
                for (const t of tasks) t();
            }
        }
    };

    return self;
}