import { Observable, Reactor, Scheduler } from "../../index";

// Mock production data
const MOCK_USERS = [
    { name: "Alice Smith", role: "Engineer", status: "online" },
    { name: "Bob Jones", role: "Designer", status: "offline" },
    { name: "Charlie Brown", role: "Product Manager", status: "online" },
    { name: "Diana Prince", role: "Engineer", status: "offline" },
    { name: "Evan Wright", role: "QA Lead", status: "online" }
];

export function UserDirectory(): HTMLDivElement {
    // 1. Setup the Engine
    const scheduler = Scheduler();
    const compute_s = scheduler.getOrCreate("compute");
    const render_s = scheduler.getOrCreate("render");

    // 2. State Domain (snake_case for non-callables)
    const search_query = Observable("");
    const status_filter = Observable("all"); // "all" | "online" | "offline"
    const filtered_users = Observable<typeof MOCK_USERS>([]);

    // 3. UI Elements (PascalCase/camelCase Elements)
    const wrapper = document.createElement("div");
    wrapper.className = "directory-wrapper";

    const search_input = document.createElement("input");
    search_input.placeholder = "Search team members...";

    const filter_select = document.createElement("select");
    filter_select.innerHTML = `
        <option value="all">All Statuses</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
    `;

    const list_container = document.createElement("ul");
    list_container.className = "user-list";

    wrapper.append(search_input, filter_select, list_container);

    // 4. Reactive Pipeline (The Business Logic)

    // Pipeline Step 1: Heavy data processing handled in the background
    Reactor(() => {
        const query = search_query.value.toLowerCase().trim();
        const filter = status_filter.value;

        filtered_users.value = MOCK_USERS.filter(user => {
            const matches_search = user.name.toLowerCase().includes(query) || user.role.toLowerCase().includes(query);
            const matches_filter = filter === "all" || user.status === filter;
            return matches_search && matches_filter;
        });
    }, { reaction_schedule: compute_s });

    // Pipeline Step 2: DOM manipulation isolated entirely to the render schedule
    Reactor(() => {
        // Clear previous items safely
        list_container.innerHTML = "";

        // Rebuild list items from current derived state
        for (const user of filtered_users.value) {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${user.name}</strong> — ${user.role} 
                <span class="badge ${user.status}">${user.status}</span>
            `;
            list_container.appendChild(li);
        }

        if (filtered_users.value.length === 0) {
            list_container.innerHTML = `<li class="no-results">No team members found.</li>`;
        }
    }, { reaction_schedule: render_s });

    // 5. Native DOM Event Handlers (Pure State Mutations)
    search_input.oninput = () => {
        search_query.value = search_input.value;
    };

    filter_select.onchange = () => {
        status_filter.value = filter_select.value;
    };

    return wrapper;
}