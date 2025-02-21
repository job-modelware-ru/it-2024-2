import { el } from "../../../node_modules/redom/dist/redom.es";
import Icon from "../Icon.jsx";

class TaskDeadline {
  constructor(props) {
    this.el =
      <div class="task-deadline-container">
        <Icon src="ic-calendar-16x16.svg" w={16} h={16}/>
        <small>{props.date}</small>
      </div>
  }
}

export default TaskDeadline;
