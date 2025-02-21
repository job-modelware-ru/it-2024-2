import { el } from "../../../node_modules/redom/dist/redom.es";
import FormCheckbox from "../forms/FormCheckbox.jsx";
import TaskControlButtons from "./TaskControlButtons.jsx";
import TaskDeadline from "./TaskDeadline.jsx";

class Task {
  constructor(props) {
    this.el =
      <div class="task-container">
        <div class="task-checkbox-container">
          <FormCheckbox label={props.name} key={props.key}/>
        </div>
        <TaskDeadline date={props.deadline}/>
        <TaskControlButtons/>
      </div>
  }
}

export default Task;
