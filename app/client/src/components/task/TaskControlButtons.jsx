import { el } from "../../../node_modules/redom/dist/redom.es";
import TaskIconButton from "./TaskIconButton.jsx";

class TaskControlButtons {
  constructor(props) {
    this.el =
      <div class="task-control-buttons-container">
        <TaskIconButton src="ic-pencil-16x16.svg" w={16} h={16}/>
        <TaskIconButton src="ic-trash-16x16.svg" w={16} h={16}/>
      </div>
  }
}

export default TaskControlButtons;
