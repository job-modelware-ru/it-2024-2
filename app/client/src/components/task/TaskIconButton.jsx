import { el } from "../../../node_modules/redom/dist/redom.es.js";
import Icon from "../Icon.jsx";

class TaskIconButton {
  constructor(props) {
    // This instantiation is needed because
    // redom + babel fails to render a jsx with
    // complex className i.e. <div class="class other-class"/>
    const btn = Object.assign(
      document.createElement("button"),
      {
        type: "button",
        className: "btn task-icon-button",
      }
    );

    const icon = <Icon src={props.src} w={props.w} h={props.h}/>
    btn.appendChild(icon.el);

    this.el = btn;
  }
}

export default TaskIconButton;
