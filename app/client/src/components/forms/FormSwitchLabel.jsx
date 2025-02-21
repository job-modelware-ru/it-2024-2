import { el } from "../../../node_modules/redom/dist/redom.es";

class FormSwitchLabel {
  constructor(props) {
    this.el = 
      <p><small>{`${props.text} `}<a href={props.link}>{props.linkText}</a></small></p>
  }
}
  
export default FormSwitchLabel;
