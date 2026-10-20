// Keeps track of open panels and dialogs so screens can close them all on navigation.

export const Overlays = {
  root: null,
  open: [],

  setRoot(el) {
    this.root = el;
  },
  add(overlay) {
    this.open.push(overlay);
    this.root.append(overlay.el);
  },
  remove(overlay) {
    this.open = this.open.filter((o) => o !== overlay);
  },
  top() {
    return this.open[this.open.length - 1];
  },
  closeAll() {
    [...this.open].reverse().forEach((o) => o.close({ silent: true }));
  },
};
