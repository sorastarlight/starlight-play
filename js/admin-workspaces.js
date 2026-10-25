/* Presentation-only navigation. Mounted editors retain their drafts and request guards. */
(() => {
  document.querySelectorAll('[data-workspaces]').forEach((root, group) => {
    const panels = [...root.children].filter(node => node.hasAttribute('data-workspace'));
    if (!panels.length) return;
    const nav = document.createElement('div');
    nav.className = 'hub-workspace-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', root.getAttribute('aria-label') || 'Workspace');
    const buttons = panels.map((panel, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `workspace-${group}-tab-${index}`;
      panel.id ||= `workspace-${group}-panel-${index}`;
      button.textContent = panel.dataset.workspace;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.tabIndex = 0;
      nav.append(button);
      button.addEventListener('click', () => select(index));
      button.addEventListener('keydown', event => {
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 :
          event.key === 'ArrowRight' ? (index + 1) % panels.length :
          event.key === 'ArrowLeft' ? (index + panels.length - 1) % panels.length : null;
        if (next === null) return;
        event.preventDefault(); buttons[next].focus();
      });
      return button;
    });
    function select(index) {
      panels.forEach((panel, i) => { panel.hidden = i !== index; });
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
    }
    root.prepend(nav); select(0);
  });
})();
