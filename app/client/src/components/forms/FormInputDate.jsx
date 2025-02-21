import { el } from "../../../node_modules/redom/dist/redom.es";

class FormInputDate {
  constructor(props) {
    const {label, key, ...otherProps} = props;

    const inputId = `base-input-${key}`;
    this.el = 
      <div>
        <label for={inputId} class="form-label">{label}</label>
        <input id={inputId} type="date" name="trip-start" value="2025-02-21" min="2025-01-01" max="2054-12-31" {...otherProps}/>
      </div>
  }
}

export default FormInputDate;
