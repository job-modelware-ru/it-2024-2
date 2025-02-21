import { el } from "../../../node_modules/redom/dist/redom.es";

class FormInputPassword {
  constructor(props) {
    const {label, key, ...otherProps} = props;

    const inputId = `base-input-${key}`;
    this.el = 
      <div>
        <label for={inputId} class="form-label">{label}</label>
        <input id={inputId} type="password" class="form-control" {...otherProps}/>
      </div>
  }
}

export default FormInputPassword;
