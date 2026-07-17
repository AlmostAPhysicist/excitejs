// theme_helpers.ts

export interface StyleConfig {
    primary_color: string;
    accent_color: string;
    border_radius: string;
    padding_scale: string;
}

//// Pure Functional Templates to generate structural DOM blocks
export function createPreviewCard(title: string, description: string, styles: StyleConfig): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "preview-card";
    card.style.borderRadius = styles.border_radius;
    card.style.padding = styles.padding_scale;
    card.style.background = "#ffffff";
    card.style.border = `1px solid ${styles.accent_color}`;
    card.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";

    card.innerHTML = `
        <h3 style="margin: 0 0 8px 0; color: ${styles.primary_color};">${title}</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #4b5563;">${description}</p>
    `;
    return card;
}

export function createPreviewButton(text: string, is_primary: boolean, styles: StyleConfig): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.borderRadius = styles.border_radius;
    btn.style.padding = `calc(${styles.padding_scale} * 0.5) ${styles.padding_scale}`;
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "600";

    if (is_primary) {
        btn.style.backgroundColor = styles.primary_color;
        btn.style.color = "#ffffff";
    } else {
        btn.style.backgroundColor = "transparent";
        btn.style.color = styles.primary_color;
        btn.style.border = `2px solid ${styles.primary_color}`;
    }
    return btn;
}

export function createAlertBox(message: string, styles: StyleConfig): HTMLDivElement {
    const alert = document.createElement("div");
    alert.className = "preview-alert";
    alert.style.borderRadius = styles.border_radius;
    alert.style.padding = styles.padding_scale;
    alert.style.backgroundColor = `${styles.accent_color}22`; // Add alpha transparency
    alert.style.borderLeft = `6px solid ${styles.accent_color}`;
    alert.style.color = styles.primary_color;
    alert.style.fontSize = "13px";
    alert.innerText = message;
    return alert;
}