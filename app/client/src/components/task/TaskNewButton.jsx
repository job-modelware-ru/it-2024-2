import { el } from "../../../node_modules/redom/dist/redom.es.js";

class TaskNewButton {
  constructor(props) {
    const btn = Object.assign(
      document.createElement("button"),
      {
        type: "button",
        className: "btn btn-outline-primary",
        textContent: "Новая задача"
      }
    );

    this.el = btn;
  }
}

export default TaskNewButton;
