import { el } from "../../node_modules/redom/dist/redom.es";
import mountWithHeader from "../utils/MountWithHeader.js";
import FormHeader from "../components/forms/FormHeader.jsx";
import FormInput from "../components/forms/FormInput.jsx";
import FormButton from "../components/forms/FormButton.jsx";
import FormCheckbox from "../components/forms/FormCheckbox.jsx";
import FormInputDate from "../components/forms/FormInputDate.jsx";

const Edit =
  <div>
    <div class="mb-3">
      <FormHeader text="Редактирование"/>
    </div>
    <div class="mb-3">
      <FormInput label="Название" placeholder="Моя задача" key="name"/>
    </div>
    <div class="mb-3">
      <FormInputDate label="Дата окончания" key="deadline"/>
    </div>
    <div class="mb-4">
      <FormCheckbox label="Важность" key="important-task"/>
    </div>
    <div class="row">
      <div class="col">
        <FormButton text="Отмена" type="danger"/>
      </div>
      <div class="col">
        <FormButton text="Сохранить" type="success"/>
      </div>
    </div>
  </div>;
  
mountWithHeader(
    document.getElementById("root"),
    Edit
);
