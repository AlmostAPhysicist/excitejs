// scheduler.ts
export type Task = () => void;

export interface Schedule {
    name: string;
    tasks: Set<Task>;
}

export interface Scheduler {
    schedules: Set<Schedule>;
    getOrCreate(name: string): Schedule;
    run(schedule?: Schedule): void;
}

export function Scheduler(): Scheduler {
    const self: Scheduler = {
        schedules: new Set<Schedule>(),

        getOrCreate(name: string): Schedule {
            for (const s of self.schedules) if (s.name === name) return s;

            const schedule = { name, tasks: new Set<Task>() };
            self.schedules.add(schedule);
            return schedule;
        },

        run(schedule?: Schedule) {
            // Case 1: Targeted Execution
            if (schedule) {
                if (!self.schedules.has(schedule)) return;

                if (schedule.tasks.size === 0) return;
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