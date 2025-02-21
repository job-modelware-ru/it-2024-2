import { el } from "../../node_modules/redom/dist/redom.es";
import mountWithHeader from "../utils/MountWithHeader.js";
import FormHeader from "../components/forms/FormHeader.jsx";
import Task from "../components/task/Task.jsx";
import TaskNewButton from "../components/task/TaskNewButton.jsx";

const testTasksData = [
  {
    name: "Задача...",
    deadline: "11.11.1111"
  },
]

const Tasks =
  <div>
    <div class="mb-3">
      <FormHeader text="Список задач"/>
    </div>
    <div class="tasks-list-container">
      {testTasksData.map((taskData, index) => 
        <Task name={taskData.name} deadline={taskData.deadline} key={`task-${index}`}/>
      )}
      <TaskNewButton/>
    </div>
  </div>;

mountWithHeader(
    document.getElementById("root"),
    Tasks
);
  