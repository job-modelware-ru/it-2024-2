import { el } from "../../../node_modules/redom/dist/redom.es";

class FormInput {
  constructor(props) {
    const {label, key, ...otherProps} = props;

    const inputId = `base-input-${key}`;
    this.el = 
      <div>
        <label for={inputId} class="form-label">{label}</label>
        <input id={inputId} type="text" class="form-control" {...otherProps}/>
      </div>
  }
}

export default FormInput;
