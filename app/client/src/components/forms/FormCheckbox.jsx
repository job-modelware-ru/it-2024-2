import { el } from "../../../node_modules/redom/dist/redom.es";

class FormCheckbox {
  constructor(props) {
    const {label, key, ...otherProps} = props;

    const checkboxId = `checkbox-${key}`;
    this.el = 
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id={checkboxId} {...otherProps} />
        <label class="form-check-label" for={checkboxId}>
          {label}
        </label>
      </div>
  }
}

export default FormCheckbox;
