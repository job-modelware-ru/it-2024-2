import { el } from "../../../node_modules/redom/dist/redom.es";

class FormHeader {
  constructor(props) {
    const {text, ...otherProps} = props;

    this.el =
      <h1 class="text-center" {...otherProps}>{props.text}</h1>
  }
}

export default FormHeader;
