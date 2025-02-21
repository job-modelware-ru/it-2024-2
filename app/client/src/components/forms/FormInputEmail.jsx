import { el } from "../../../node_modules/redom/dist/redom.es";

class FormInputEmail {
  constructor(props) {
    const {label, key, ...otherProps} = props;

    const inputId = `base-input-${key}`;
    this.el = 
      <div>
        <label for={inputId} class="form-label">{label}</label>
        <input id={inputId} type="email" class="form-control" {...otherProps} required/>
      </div>
  }
}

export default FormInputEmail;
